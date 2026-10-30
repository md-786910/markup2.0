// Customer status and revenue as shown in the admin panel

const DAY_MS = 24 * 60 * 60 * 1000;
// Plans billed monthly at a list price; enterprise is a custom deal
const PRICED_PLANS = ['starter', 'pro'];

// The custom deal that applies right now, or null. Deals only bring in money
// while the org is on a paid plan with an active subscription.
function activeDeal(org, now = new Date()) {
  const deal = org.deal;
  if (!deal || deal.price == null) return null;
  if (deal.until && new Date(deal.until) <= now) return null;
  if (![...PRICED_PLANS, 'enterprise'].includes(org.plan) || org.subscription?.status !== 'active') return null;
  return deal;
}

// Monthly revenue of an org (USD), prioritizing active custom deals then list price
function monthlyRevenue(org, plans) {
  const deal = activeDeal(org);
  if (deal) {
    if (deal.currency === 'INR') {
      const { USD_INR_RATE } = require('../config/plans');
      return Math.round(Number(deal.price) / USD_INR_RATE) || 0;
    }
    return Number(deal.price) || 0;
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

module.exports = { PRICED_PLANS, activeDeal, monthlyRevenue, lifecycleStatus };
