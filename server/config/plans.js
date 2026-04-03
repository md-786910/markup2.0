const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    period: 'forever',
    limits: { maxProjects: 3, maxMembers: 5, maxGuests: 2 },
    features: [
      '3 projects',
      '5 team members',
      '2 guests',
      'Basic feedback tools',
    ],
    badgeColor: 'gray',
    order: 0,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 12,
    priceLabel: '$12',
    period: '/month',
    limits: { maxProjects: 15, maxMembers: 25, maxGuests: 10 },
    features: [
      '15 projects',
      '25 team members',
      '10 guests',
      'Guest review links',
      'Slack integration',
      'Activity log',
    ],
    badgeColor: 'blue',
    order: 1,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || null,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceLabel: '$29',
    period: '/month',
    popular: true,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null,
    limits: { maxProjects: 999, maxMembers: 999, maxGuests: 50 },
    features: [
      'Unlimited projects',
      'Unlimited members',
      '50 guests',
      'Priority support',
      'Slack, Jira & Discord integrations',
      'Activity log & version history',
      'Guest review links',
    ],
    badgeColor: 'purple',
    order: 2,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    priceLabel: 'Custom',
    period: '',
    limits: { maxProjects: 9999, maxMembers: 9999, maxGuests: 9999 },
    features: [
      'Everything in Pro',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
    badgeColor: 'amber',
    order: 3,
  },
};

const DEFAULT_TRIAL_DAYS = 30;

const PLAN_LIST = Object.values(PLANS).sort((a, b) => a.order - b.order);

const UPGRADEABLE_PLANS = ['starter', 'pro'];

// In-memory cache for plan overrides (5-minute TTL)
let _overrideCache = null;
let _overrideCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function _getOverrides() {
  const now = Date.now();
  if (_overrideCache && now - _overrideCacheTime < CACHE_TTL) {
    return _overrideCache;
  }
  try {
    const PlanConfig = require('../models/PlanConfig');
    const configs = await PlanConfig.find();
    const map = {};
    for (const c of configs) { map[c.planId] = c; }
    _overrideCache = map;
    _overrideCacheTime = now;
    return map;
  } catch {
    return _overrideCache || {};
  }
}

function clearPlanCache() {
  _overrideCache = null;
  _overrideCacheTime = 0;
}

function getLimitsForPlan(planId) {
  if (planId === 'trial') return { ...PLANS.free.limits };
  const plan = PLANS[planId];
  return plan ? { ...plan.limits } : { ...PLANS.free.limits };
}

async function getLimitsForPlanAsync(planId) {
  const base = getLimitsForPlan(planId);
  const overrides = await _getOverrides();
  const effectiveId = planId === 'trial' ? 'free' : planId;
  const override = overrides[effectiveId];
  if (override && override.limits) {
    if (override.limits.maxProjects != null) base.maxProjects = override.limits.maxProjects;
    if (override.limits.maxMembers != null) base.maxMembers = override.limits.maxMembers;
    if (override.limits.maxGuests != null) base.maxGuests = override.limits.maxGuests;
  }
  return base;
}

async function getPlansWithOverrides() {
  const overrides = await _getOverrides();
  const result = {};
  for (const [key, plan] of Object.entries(PLANS)) {
    const merged = { ...plan, limits: { ...plan.limits }, enabled: true };
    const override = overrides[key];
    if (override) {
      if (override.enabled === false) merged.enabled = false;
      if (override.limits) {
        if (override.limits.maxProjects != null) merged.limits.maxProjects = override.limits.maxProjects;
        if (override.limits.maxMembers != null) merged.limits.maxMembers = override.limits.maxMembers;
        if (override.limits.maxGuests != null) merged.limits.maxGuests = override.limits.maxGuests;
      }
    }
    result[key] = merged;
  }
  return result;
}

module.exports = { PLANS, PLAN_LIST, UPGRADEABLE_PLANS, DEFAULT_TRIAL_DAYS, getLimitsForPlan, getLimitsForPlanAsync, getPlansWithOverrides, clearPlanCache };
