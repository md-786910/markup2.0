// Customer status and revenue as shown in the admin panel

const DAY_MS = 24 * 60 * 60 * 1000;
// Plans billed monthly at a list price; enterprise is a custom deal
const PRICED_PLANS = ['starter', 'pro'];

// Monthly revenue of an org (USD), prioritizing active custom deals then list price
function monthlyRevenue(org, plans) {
  const now = new Date();
  const dealActive = org.deal && org.deal.price != null && (!org.deal.until || new Date(org.deal.until) > now);
  if (dealActive) {
    if (org.deal.currency === 'INR') {
      return Math.round(Number(org.deal.price) / 84) || 0;
    }
    return Number(org.deal.price) || 0;
  }
  if (!PRICED_PLANS.includes(org.plan) || org.subscription?.status !== 'active') return 0;
  return Number(plans[org.plan]?.price) || 0;
}

// One lifecycle status per org, most important first
function lifecycleStatus(org, now = Date.now()) {
  if (org.deletionScheduledAt) return 'deleting';
  if (org.isLocked) return 'locked';
  if (org.plan === 'trial') {
    return org.trialEndsAt && new Date(org.trialEndsAt).getTime() - now < 7 * DAY_MS ? 'trial_ending' : 'trial';
  }
  if (org.subscription?.cancelAtPeriodEnd) return 'cancelling';
  if (org.plan === 'free') return 'free';
  return 'paying';
}

module.exports = { PRICED_PLANS, monthlyRevenue, lifecycleStatus };
