const Invoice = require('../models/Invoice');
const Organization = require('../models/Organization');
const { getLimitsForPlanAsync } = require('../config/plans');
const { clearBillingLock } = require('../utils/orgUtils');

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
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return { ok: false, reason: 'invoice_not_found' };
  if (invoice.status === 'paid') return { ok: true, alreadyPaid: true, invoice };

  const org = await Organization.findById(invoice.organization);
  if (!org) return { ok: false, reason: 'org_not_found' };

  // Compute period — extend from existing currentPeriodEnd if same plan still active
  let periodStart = new Date();
  if (
    org.subscription &&
    org.subscription.currentPeriodEnd &&
    org.subscription.currentPeriodEnd > new Date() &&
    org.plan === invoice.plan
  ) {
    periodStart = new Date(org.subscription.currentPeriodEnd);
  }
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  invoice.status = 'paid';
  invoice.periodStart = periodStart;
  invoice.periodEnd = periodEnd;
  if (invoice.provider === 'razorpay' && providerPaymentId) {
    invoice.razorpayPaymentId = providerPaymentId;
  }
  if (invoice.provider === 'paypal') {
    if (providerCaptureId) invoice.paypalCaptureId = providerCaptureId;
    else if (providerPaymentId) invoice.paypalCaptureId = providerPaymentId;
  }
  await invoice.save();

  org.plan = invoice.plan;
  org.limits = await getLimitsForPlanAsync(invoice.plan);
  clearBillingLock(org);
  org.trialEndsAt = null;

  if (!org.subscription) org.subscription = {};
  org.subscription.status = 'active';
  org.subscription.currentPeriodEnd = periodEnd;
  org.subscription.provider = invoice.provider;

  await org.save();

  return { ok: true, invoice, org, periodEnd };
}

module.exports = { settleInvoice };
