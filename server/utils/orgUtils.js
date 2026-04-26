const BILLING_LOCK_REASONS = new Set([
  'Payment overdue',
  'Trial expired',
]);

/**
 * Clear an org lock only if it was set by the billing system (overdue payment or
 * expired trial). Manual admin locks (any other reason) are preserved so a customer
 * cannot pay themselves out of an admin lock.
 */
function clearBillingLock(org) {
  if (org.isLocked && BILLING_LOCK_REASONS.has(org.lockedReason)) {
    org.isLocked = false;
    org.lockedAt = null;
    org.lockedReason = null;
  }
}

/**
 * Check if an organization's trial has expired and lock it if so.
 * Paid plan locking based on overdue invoices is handled by the daily cron
 * (server/scripts/runBilling.js) — this function does NOT auto-lock paid orgs
 * based on currentPeriodEnd, to keep "overdue" defined by Invoice.dueAt only.
 * Returns true if the org is locked.
 */
async function checkTrialExpiry(org) {
  if (!org) return false;

  // Already locked
  if (org.isLocked) return true;

  // Auto-lock expired trial plans
  if (org.plan === 'trial' && org.trialEndsAt && org.trialEndsAt < new Date()) {
    org.isLocked = true;
    org.lockedAt = new Date();
    org.lockedReason = 'Trial expired';
    await org.save({ validateBeforeSave: false });
    return true;
  }

  return false;
}

module.exports = { checkTrialExpiry, clearBillingLock, BILLING_LOCK_REASONS };
