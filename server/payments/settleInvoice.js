const Invoice = require('../models/Invoice');
const Organization = require('../models/Organization');
const { getLimitsForPlanAsync } = require('../config/plans');
const { clearBillingLock } = require('../utils/orgUtils');
const { addMonthsUTC } = require('../utils/billingDates');
const { assignInvoiceDetails } = require('./invoiceIssuer');
const { URLS } = require('../config/env');

const CLIENT_ORIGIN = URLS.app;

// Owner gets a receipt with the invoice number. Fire-and-forget: an email
// problem must never undo or fail a settled payment.
async function sendReceipt(invoice, org, ownerEmail) {
  if (!ownerEmail) return;
  try {
    const { getPlansWithOverrides } = require('../config/plans');
    const plans = await getPlansWithOverrides();
    await require('../utils/mailer').sendPaymentReceiptEmail(ownerEmail, {
      orgName: org.name,
      planName: plans[invoice.plan]?.name || invoice.plan,
      amount: invoice.amount,
      currency: invoice.currency,
      invoiceNumber: invoice.invoiceNumber,
      periodEnd: invoice.periodEnd,
      invoicesUrl: `${CLIENT_ORIGIN}/settings?tab=invoices`,
    });
  } catch (err) {
    console.error(`[billing] receipt email for invoice ${invoice._id} failed: ${err.message}`);
  }
}

/**
 * Apply post-payment side effects for an invoice. Idempotent — short-circuits
 * if the invoice is already paid. Used by both the controller verify path and
 * the webhook path, for both providers, so the org/plan transition logic lives
 * in exactly one place.
 *
 * @param {string|ObjectId} invoiceId
 * @param {Object} opts
 * @param {string} opts.providerPaymentId   — razorpay_payment_id OR paypal capture id
 * @param {string} [opts.providerCaptureId] — paypal capture id (separate from order id)
 */
async function settleInvoice(invoiceId, { providerPaymentId, providerCaptureId } = {}) {
  // Atomically claim the invoice so concurrent settles (client verify + provider
  // webhook arriving together) can't both apply the plan/period side effects.
  const previous = await Invoice.findOneAndUpdate(
    { _id: invoiceId, status: { $ne: 'paid' } },
    { $set: { status: 'paid' } },
    { returnDocument: 'before' },
  );
  if (!previous) {
    const existing = await Invoice.findById(invoiceId);
    if (!existing) return { ok: false, reason: 'invoice_not_found' };
    return { ok: true, alreadyPaid: true, invoice: existing };
  }
  const previousStatus = previous.status;

  try {
    const invoice = await Invoice.findById(invoiceId);
    const org = await Organization.findById(invoice.organization);
    if (!org) {
      await Invoice.updateOne({ _id: invoiceId }, { $set: { status: previousStatus } });
      return { ok: false, reason: 'org_not_found' };
    }

    const isRenewal = !!invoice.billingMonth;
    let periodStart;
    let periodEnd;
    if (isRenewal) {
      // Renewal invoice from runBilling: the cron already advanced
      // currentPeriodEnd to the end of the cycle this invoice pays for, so
      // paying it must not extend the period again.
      periodEnd = org.subscription?.currentPeriodEnd
        ? new Date(org.subscription.currentPeriodEnd)
        : addMonthsUTC(new Date(), 1);
      periodStart = addMonthsUTC(periodEnd, -1);
    } else {
      // Checkout invoice: extend from existing currentPeriodEnd if same plan still active
      periodStart = new Date();
      if (
        org.subscription &&
        org.subscription.currentPeriodEnd &&
        org.subscription.currentPeriodEnd > new Date() &&
        org.plan === invoice.plan
      ) {
        periodStart = new Date(org.subscription.currentPeriodEnd);
      }
      periodEnd = addMonthsUTC(periodStart, 1);
    }

    invoice.periodStart = periodStart;
    invoice.periodEnd = periodEnd;
    const owner = await require('../models/User').findOne({ organization: org._id, role: 'owner' }).select('email');
    await assignInvoiceDetails(invoice, org, owner?.email);
    if (invoice.provider === 'razorpay' && providerPaymentId) {
      invoice.razorpayPaymentId = providerPaymentId;
    }
    if (invoice.provider === 'paypal') {
      if (providerCaptureId) invoice.paypalCaptureId = providerCaptureId;
      else if (providerPaymentId) invoice.paypalCaptureId = providerPaymentId;
    }
    await invoice.save();

    // A late-paid renewal for a plan the org has since left only clears the
    // billing lock; it must not switch the org back to the old plan.
    if (!isRenewal || org.plan === invoice.plan) {
      org.plan = invoice.plan;
      org.limits = await getLimitsForPlanAsync(invoice.plan);
      org.subscription = org.subscription || {};
      org.subscription.currentPeriodEnd = periodEnd;
    }
    clearBillingLock(org);
    org.trialEndsAt = null;

    if (!org.subscription) org.subscription = {};
    org.subscription.status = 'active';
    org.subscription.provider = invoice.provider;
    // Paying again (or paying a renewal) means the customer is staying
    org.subscription.cancelAtPeriodEnd = false;

    await org.save();

    // A new checkout restarts the billing period, so any other unpaid invoices
    // for the org (abandoned checkouts, the previous plan's renewal) no longer
    // apply and must not lock the org later.
    if (!isRenewal) {
      await Invoice.updateMany(
        { organization: org._id, status: 'pending', _id: { $ne: invoice._id } },
        { $set: { status: 'void' } },
      );
    }

    sendReceipt(invoice, org, owner?.email);

    return { ok: true, invoice, org, periodEnd };
  } catch (err) {
    // Release the claim so a retry (webhook redelivery) can settle it.
    await Invoice.updateOne({ _id: invoiceId }, { $set: { status: previousStatus } }).catch(() => {});
    throw err;
  }
}

module.exports = { settleInvoice };
