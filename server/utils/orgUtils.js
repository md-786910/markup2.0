/**
 * Check if an organization's trial has expired and lock it if so.
 * Called from auth middleware on every authenticated request.
 * Returns true if the org is locked.
 */
async function checkTrialExpiry(org) {
  if (!org) return false;

  // Already locked
  if (org.isLocked) return true;

  // Only auto-lock trial plans that have expired
  if (org.plan === 'trial' && org.trialEndsAt && org.trialEndsAt < new Date()) {
    org.isLocked = true;
    org.lockedAt = new Date();
    org.lockedReason = 'Trial expired';
    await org.save({ validateBeforeSave: false });
    return true;
  }

  // Active subscription plans with past_due status — lock after grace
  if (org.subscription && org.subscription.status === 'past_due') {
    const gracePeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (org.subscription.currentPeriodEnd &&
        new Date(org.subscription.currentPeriodEnd).getTime() + gracePeriod < Date.now()) {
      org.isLocked = true;
      org.lockedAt = new Date();
      org.lockedReason = 'Payment overdue';
      await org.save({ validateBeforeSave: false });
      return true;
    }
  }

  return false;
}

module.exports = { checkTrialExpiry };
