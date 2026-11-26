// Customer status and revenue as shown in the admin panel

const { USD_INR_RATE } = require('../config/plans');

const DAY_MS = 24 * 60 * 60 * 1000;
// Plans billed monthly at a list price; enterprise is a custom deal
const PRICED_PLANS = ['starter', 'pro'];

const PAID_PLANS = [...PRICED_PLANS, 'enterprise'];

// An active custom price (deal) of an org, or null
function activeDeal(org, now = new Date()) {
  const d = org.deal;
  return d && d.price != null && (!d.until || new Date(d.until) > now) ? d : null;
}

// Monthly revenue of an org in USD (INR deals converted at RAZORPAY_USD_INR_RATE).
// Only orgs on a paid plan with an active subscription bring in money: a deal
// left on a free, cancelled or unpaid org is not revenue.
function monthlyRevenue(org, plans, now = new Date()) {
  if (!PAID_PLANS.includes(org.plan) || org.isLocked || org.deletionScheduledAt) return 0;
  const deal = activeDeal(org, now);
  if (deal) {
    if (org.plan === 'free' || org.subscription?.status === 'canceled') return 0;
    const price = Number(deal.price) || 0;
    return deal.currency === 'INR' ? Math.round(price / USD_INR_RATE) : price;
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
  if (org.plan === 'enterprise' && (activeDeal(org, new Date(now)) || org.subscription?.status === 'active')) return 'paying';
  // A paid plan whose renewal failed (past_due / halted) is not paying
  if (org.subscription?.status !== 'active') return 'past_due';
  return 'paying';
}

// Record the end of a paid subscription; call before the org moves to free
function markSubscriptionEnded(org, plans, now = new Date()) {
  if (!org.subscription) org.subscription = {};
  org.subscription.endedAt = now;
  org.subscription.endedPlan = org.plan;
  org.subscription.endedMrr = monthlyRevenue(org, plans || {}, now);
}

module.exports = { markSubscriptionEnded, PRICED_PLANS, PAID_PLANS, activeDeal, monthlyRevenue, lifecycleStatus };
