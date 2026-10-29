const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    period: 'forever',
    limits: { maxProjects: 2, maxWorkspaces: 1, maxMembers: 5, maxGuests: 2, maxStorageMB: 200, hasIntegrations: false, hasActivityLogs: false, hasVersionHistory: false },
    features: [
      '2 projects',
      '1 workspace',
      '5 team members',
      '2 guests',
      '200 MB storage',
      'Basic feedback tools',
      'Email support',
    ],
    // tickets: in-app requests; chat: live chat; replyHours: first-reply target
    support: { tickets: false, chat: false, priority: 'normal', replyHours: null },
    badgeColor: 'gray',
    order: 0,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 12,
    priceLabel: '$12',
    period: '/month',
    limits: { maxProjects: 15, maxWorkspaces: 3, maxMembers: 25, maxGuests: 10, maxStorageMB: 5120, hasIntegrations: true, hasActivityLogs: true, hasVersionHistory: false },
    features: [
      '15 projects',
      '3 workspaces',
      '25 team members',
      '10 guests',
      '5 GB storage',
      'Guest review links',
      'Slack, Jira, Discord & Teams integrations',
      'Activity log',
      'In-app support',
    ],
    support: { tickets: true, chat: false, priority: 'normal', replyHours: 48 },
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
    limits: { maxProjects: 999, maxWorkspaces: 999, maxMembers: 999, maxGuests: 50, maxStorageMB: 25600, hasIntegrations: true, hasActivityLogs: true, hasVersionHistory: true },
    features: [
      'Unlimited projects',
      'Unlimited workspaces',
      'Unlimited members',
      '50 guests',
      '25 GB storage',
      'Priority support and live chat',
      'Slack, Jira, Discord & Teams integrations',
      'Activity log & version history',
      'Guest review links',
    ],
    support: { tickets: true, chat: true, priority: 'high', replyHours: 24 },
    badgeColor: 'purple',
    order: 2,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    priceLabel: 'Custom',
    period: '',
    limits: { maxProjects: 9999, maxWorkspaces: 9999, maxMembers: 9999, maxGuests: 9999, maxStorageMB: 102400, hasIntegrations: true, hasActivityLogs: true, hasVersionHistory: true },
    features: [
      'Everything in Pro',
      '100 GB storage',
      'Dedicated support',
      'Custom integrations',
      'Custom terms & onboarding',
    ],
    support: { tickets: true, chat: true, priority: 'urgent', replyHours: 8 },
    badgeColor: 'amber',
    order: 3,
  },
};

const DEFAULT_TRIAL_DAYS = 30;
// Fallback USD→INR conversion when a plan has no explicit INR price (admin → Pricing)
const USD_INR_RATE = parseFloat(process.env.RAZORPAY_USD_INR_RATE || '84');

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

// Support channels for a plan; running trials get Pro's. An expired trial
// keeps in-app requests (to sort out billing) at Starter's level.
function getSupportForPlan(planId, trialEndsAt = null) {
  let id = planId === 'trial' ? 'pro' : planId;
  if (planId === 'trial' && trialEndsAt && new Date(trialEndsAt) < new Date()) id = 'starter';
  const plan = PLANS[id] || PLANS.free;
  return { ...plan.support };
}

// Support for one organization: its plan's, then the org's own overrides
// (limitOverrides.support*, set in the admin panel)
const SUPPORT_OVERRIDES = { supportTickets: 'tickets', supportChat: 'chat', supportPriority: 'priority', supportReplyHours: 'replyHours' };
function getSupportForOrg(org) {
  const support = getSupportForPlan(org.plan, org.trialEndsAt);
  const o = org.limitOverrides || {};
  for (const [key, field] of Object.entries(SUPPORT_OVERRIDES)) {
    if (o[key] !== undefined && o[key] !== null) support[field] = o[key];
  }
  return support;
}

function getLimitsForPlan(planId) {
  // Trials get Pro features so teams experience everything before choosing a plan
  if (planId === 'trial') return { ...PLANS.pro.limits };
  const plan = PLANS[planId];
  return plan ? { ...plan.limits } : { ...PLANS.free.limits };
}

async function getLimitsForPlanAsync(planId) {
  const base = getLimitsForPlan(planId);
  const overrides = await _getOverrides();
  const effectiveId = planId === 'trial' ? 'pro' : planId;
  const override = overrides[effectiveId];
  if (override && override.limits) {
    if (override.limits.maxProjects != null) base.maxProjects = override.limits.maxProjects;
    if (override.limits.maxWorkspaces != null) base.maxWorkspaces = override.limits.maxWorkspaces;
    if (override.limits.maxMembers != null) base.maxMembers = override.limits.maxMembers;
    if (override.limits.maxGuests != null) base.maxGuests = override.limits.maxGuests;
    if (override.limits.maxStorageMB != null) base.maxStorageMB = override.limits.maxStorageMB;
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
        if (override.limits.maxStorageMB != null) merged.limits.maxStorageMB = override.limits.maxStorageMB;
        if (override.limits.hasIntegrations != null) merged.limits.hasIntegrations = override.limits.hasIntegrations;
        if (override.limits.hasActivityLogs != null) merged.limits.hasActivityLogs = override.limits.hasActivityLogs;
        if (override.limits.hasVersionHistory != null) merged.limits.hasVersionHistory = override.limits.hasVersionHistory;
      }
      if (override.name != null) merged.name = override.name;
      // price: null means "Custom", so accept null but skip undefined
      if (override.price !== undefined) merged.price = override.price;
      // Free is always $0; an empty price saved for it must not turn it into "Custom"
      if (key === 'free') merged.price = 0;
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
    // INR price for Razorpay: an explicit admin price, else the USD price converted at a fixed rate
    merged.priceInr = override && override.priceInr != null
      ? override.priceInr
      : (typeof merged.price === 'number' ? Math.round(merged.price * USD_INR_RATE) : null);
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

// Limits an org actually has: its plan's limits (with admin plan overrides),
// then the org's own superadmin overrides (unset keys keep the plan value).
async function getEffectiveLimitsAsync(org) {
  const base = await getLimitsForPlanAsync(org.plan);
  const raw = org.limitOverrides ? (org.limitOverrides.toObject ? org.limitOverrides.toObject() : org.limitOverrides) : {};
  // Support overrides are not limits (getSupportForOrg reads them)
  const overrides = Object.fromEntries(Object.entries(raw).filter(([k, v]) => v !== undefined && v !== null && !(k in SUPPORT_OVERRIDES)));
  return { ...base, ...overrides };
}

module.exports = { getSupportForPlan, getSupportForOrg, getEffectiveLimitsAsync, PLANS, PLAN_LIST, UPGRADEABLE_PLANS, DEFAULT_TRIAL_DAYS, getLimitsForPlan, getLimitsForPlanAsync, getPlansWithOverrides, getNewSignupPlanMode, clearPlanCache };
