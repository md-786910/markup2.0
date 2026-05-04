const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    period: 'forever',
    limits: { maxProjects: 2, maxMembers: 5, maxGuests: 2, hasIntegrations: false, hasActivityLogs: false, hasVersionHistory: false },
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
    limits: { maxProjects: 15, maxMembers: 25, maxGuests: 10, hasIntegrations: true, hasActivityLogs: true, hasVersionHistory: false },
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
    razorpayPlanId: process.env.RAZORPAY_STARTER_PLAN_ID || null,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceLabel: '$29',
    period: '/month',
    popular: true,
    razorpayPlanId: process.env.RAZORPAY_PRO_PLAN_ID || null,
    limits: { maxProjects: 999, maxMembers: 999, maxGuests: 50, hasIntegrations: true, hasActivityLogs: true, hasVersionHistory: true },
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
    limits: { maxProjects: 9999, maxMembers: 9999, maxGuests: 9999, hasIntegrations: true, hasActivityLogs: true, hasVersionHistory: true },
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
    if (override.limits.hasIntegrations != null) base.hasIntegrations = override.limits.hasIntegrations;
    if (override.limits.hasActivityLogs != null) base.hasActivityLogs = override.limits.hasActivityLogs;
    if (override.limits.hasVersionHistory != null) base.hasVersionHistory = override.limits.hasVersionHistory;
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
        if (override.limits.hasIntegrations != null) merged.limits.hasIntegrations = override.limits.hasIntegrations;
        if (override.limits.hasActivityLogs != null) merged.limits.hasActivityLogs = override.limits.hasActivityLogs;
        if (override.limits.hasVersionHistory != null) merged.limits.hasVersionHistory = override.limits.hasVersionHistory;
      }
      if (override.name != null) merged.name = override.name;
      // price: null means "Custom", so accept null but skip undefined
      if (override.price !== undefined) merged.price = override.price;
      if (override.priceLabel != null) merged.priceLabel = override.priceLabel;
      if (override.period != null) merged.period = override.period;
      // explicit [] is an intentional override; missing field falls through
      if (Array.isArray(override.features)) merged.features = override.features;
      if (override.popular != null) merged.popular = override.popular;
      if (override.badgeColor != null) merged.badgeColor = override.badgeColor;
      if (override.order != null) merged.order = override.order;
      if (override.razorpayPlanId != null) merged.razorpayPlanId = override.razorpayPlanId;
      if (override.assignToNewSignups != null) merged.assignToNewSignups = override.assignToNewSignups;
    }
    result[key] = merged;
  }
  return result;
}

// Returns 'free' if admin has flagged the free plan as the default for new
// signups (and free is enabled); otherwise 'trial'. Reuses _getOverrides cache.
async function getNewSignupPlanMode() {
  const overrides = await _getOverrides();
  const freeOverride = overrides.free;
  if (freeOverride && freeOverride.assignToNewSignups === true && freeOverride.enabled !== false) {
    return 'free';
  }
  return 'trial';
}

module.exports = { PLANS, PLAN_LIST, UPGRADEABLE_PLANS, DEFAULT_TRIAL_DAYS, getLimitsForPlan, getLimitsForPlanAsync, getPlansWithOverrides, getNewSignupPlanMode, clearPlanCache };
