const Invoice = require('../models/Invoice');
const Organization = require('../models/Organization');
const { getLimitsForPlanAsync } = require('../config/plans');

/**
 * Record a refund on an invoice. Used by provider webhooks (refund made in the
 * Razorpay/PayPal dashboard) and by the admin refund action. Idempotent: the
 * webhook that follows an admin refund changes nothing.
 *
 * A full refund of the invoice that pays for the org's current period ends the
 * paid plan immediately (org moves to free); partial refunds are only recorded.
 *
 * @param {Object} invoice  Invoice document
 * @param {number} refundedTotal  total refunded so far for this payment, smallest unit
 */
async function applyRefund(invoice, refundedTotal) {
  const total = Math.min(refundedTotal, invoice.amount);
  if (invoice.status === 'refunded' && (invoice.refundAmount || 0) >= total) {
    return { ok: true, alreadyApplied: true };
  }
  const full = total >= invoice.amount;
  invoice.refundAmount = total;
  invoice.refundedAt = new Date();
  if (full) invoice.status = 'refunded';
  await invoice.save();

  let downgraded = false;
  if (full) {
    const org = await Organization.findById(invoice.organization);
    const coversCurrentPeriod = invoice.periodEnd && new Date(invoice.periodEnd) > new Date();
    if (org && org.plan === invoice.plan && coversCurrentPeriod) {
      org.plan = 'free';
      org.limits = await getLimitsForPlanAsync('free');
      if (!org.subscription) org.subscription = {};
      org.subscription.status = 'canceled';
      org.subscription.currentPeriodEnd = null;
      org.subscription.cancelAtPeriodEnd = false;
      await org.save();
      await Invoice.updateMany({ organization: org._id, status: 'pending' }, { $set: { status: 'void' } });
      downgraded = true;
    }
  }
  console.log(`[billing] refund recorded on invoice ${invoice._id} (${full ? 'full' : 'partial'}${downgraded ? ', org moved to free' : ''})`);
  return { ok: true, full, downgraded };
}

module.exports = { applyRefund };
