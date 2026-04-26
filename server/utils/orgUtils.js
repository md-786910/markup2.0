/**
 * Check if an organization's trial has expired and lock it if so.
 * Also checks if a paid subscription has expired (past its currentPeriodEnd).
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

  // Active subscription plans — lock if currentPeriodEnd has passed
  if (org.plan !== 'trial' && org.subscription && org.subscription.currentPeriodEnd) {
    if (new Date(org.subscription.currentPeriodEnd).getTime() < Date.now()) {
      org.isLocked = true;
      org.lockedAt = new Date();
      org.lockedReason = 'Payment overdue / Subscription expired';
      org.subscription.status = 'past_due';
      await org.save({ validateBeforeSave: false });
      return true;
    }
  }

  return false;
}

module.exports = { checkTrialExpiry };
