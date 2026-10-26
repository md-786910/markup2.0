const User = require('../models/User');
const Organization = require('../models/Organization');
const Project = require('../models/Project');
const Pin = require('../models/Pin');
const Activity = require('../models/Activity');
const PlanConfig = require('../models/PlanConfig');
const Invoice = require('../models/Invoice');
const PaymentSettings = require('../models/PaymentSettings');
const asyncHandler = require('../utils/asyncHandler');
const { PLANS, getPlansWithOverrides, clearPlanCache, getLimitsForPlanAsync } = require('../config/plans');
const {
  getProvider,
  getProviderStatus,
  clearPaymentSettingsCache,
} = require('../payments');
const { logOrgActivity } = require('../utils/activityLogger');
const { clearBillingLock } = require('../utils/orgUtils');
const { addMonthsUTC } = require('../utils/billingDates');
const { applyRefund } = require('../payments/refundInvoice');

// Page/limit from the query string, clamped so a request can't pull a whole collection
function parsePaging(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit };
}

// ── Dashboard Stats ──────────────────────────────────────────────

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [
    totalUsers,
    activeUsers,
    totalOrgs,
    planBreakdown,
    subscriptionStats,
    recentSignups,
    recentActivity,
    monthlySignups,
    totalProjects,
  ] = await Promise.all([
    User.countDocuments({ role: { $ne: 'superadmin' } }),
    User.countDocuments({ lastSeen: { $gte: sevenDaysAgo }, role: { $ne: 'superadmin' } }),
    Organization.countDocuments(),
    Organization.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]),
    Organization.aggregate([
      { $group: { _id: '$subscription.status', count: { $sum: 1 } } },
    ]),
    User.find({ role: { $ne: 'superadmin' } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name email role createdAt organization')
      .populate('organization', 'name plan'),
    Activity.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('actor', 'name email')
      .populate('project', 'name'),
    User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, role: { $ne: 'superadmin' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Project.countDocuments(),
  ]);

  const planMap = {};
  for (const p of planBreakdown) { planMap[p._id || 'none'] = p.count; }

  const subMap = {};
  for (const s of subscriptionStats) { subMap[s._id || 'none'] = s.count; }

  res.json({
    totalUsers,
    activeUsers,
    totalOrgs,
    totalProjects,
    planBreakdown: planMap,
    subscriptionStats: subMap,
    recentSignups,
    recentActivity,
    monthlySignups,
  });
});

// ── Organizations ────────────────────────────────────────────────

exports.getOrganizations = asyncHandler(async (req, res) => {
  const { plan, status, search } = req.query;
  const { page, limit } = parsePaging(req.query);
  const skip = (page - 1) * limit;

  const filter = {};
  if (plan) filter.plan = plan;
  if (status === 'locked') filter.isLocked = true;
  if (status === 'active') filter.isLocked = { $ne: true };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const [orgs, total] = await Promise.all([
    Organization.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('owner', 'name email'),
    Organization.countDocuments(filter),
  ]);

  // Batch count members and projects per org
  const orgIds = orgs.map(o => o._id);
  const [memberCounts, projectCounts] = await Promise.all([
    User.aggregate([
      { $match: { organization: { $in: orgIds } } },
      { $group: { _id: '$organization', count: { $sum: 1 } } },
    ]),
    Project.aggregate([
      { $match: { organization: { $in: orgIds } } },
      { $group: { _id: '$organization', count: { $sum: 1 } } },
    ]),
  ]);

  const memberMap = {};
  for (const m of memberCounts) { memberMap[m._id.toString()] = m.count; }
  const projectMap = {};
  for (const p of projectCounts) { projectMap[p._id.toString()] = p.count; }

  const data = orgs.map(org => ({
    ...org.toObject(),
    memberCount: memberMap[org._id.toString()] || 0,
    projectCount: projectMap[org._id.toString()] || 0,
  }));

  res.json({
    organizations: data,
    total,
    page: page,
    totalPages: Math.ceil(total / limit),
  });
});

exports.getOrganizationDetail = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id).populate('owner', 'name email');
  if (!org) return res.status(404).json({ message: 'Organization not found' });

  const [members, projects, pinStats, invoices] = await Promise.all([
    User.find({ organization: org._id }).select('name email role lastSeen avatar createdAt'),
    Project.find({ organization: org._id }).select('name projectType websiteUrl status projectStatus members createdAt'),
    Pin.aggregate([
      { $lookup: { from: 'projects', localField: 'project', foreignField: '_id', as: 'proj' } },
      { $unwind: '$proj' },
      { $match: { 'proj.organization': org._id } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
      }},
    ]),
    // Invoice does not store any Razorpay secrets — safe to return as-is.
    // Do NOT add credentials to this projection if Invoice schema ever grows.
    Invoice.find({ organization: org._id }).sort({ createdAt: -1 }).lean(),
  ]);

  res.json({
    organization: org,
    members,
    projects,
    pinStats: pinStats[0] || { total: 0, resolved: 0 },
    invoices,
  });
});

exports.lockOrganization = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const org = await Organization.findByIdAndUpdate(
    req.params.id,
    { isLocked: true, lockedAt: new Date(), lockedReason: reason || 'Locked by admin' },
    { returnDocument: 'after' },
  );
  if (!org) return res.status(404).json({ message: 'Organization not found' });
  logOrgActivity(org._id, req.user._id, 'org.locked', {
    reason: org.lockedReason,
    actorRole: 'superadmin',
  });
  res.json({ organization: org });
});

exports.unlockOrganization = asyncHandler(async (req, res) => {
  const org = await Organization.findByIdAndUpdate(
    req.params.id,
    { isLocked: false, lockedAt: null, lockedReason: null },
    { returnDocument: 'after' },
  );
  if (!org) return res.status(404).json({ message: 'Organization not found' });
  logOrgActivity(org._id, req.user._id, 'org.unlocked', {
    actorRole: 'superadmin',
  });
  res.json({ organization: org });
});

// ── Users ────────────────────────────────────────────────────────

exports.getUsers = asyncHandler(async (req, res) => {
  const { role, search, orgId } = req.query;
  const { page, limit } = parsePaging(req.query);
  const skip = (page - 1) * limit;

  const filter = { role: { $ne: 'superadmin' } };
  if (role) filter.role = role;
  if (orgId) filter.organization = orgId;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name email role organization lastSeen lastLoginIp lastLoginLocation signupIp signupLocation avatar createdAt')
      .populate('organization', 'name plan'),
    User.countDocuments(filter),
  ]);

  res.json({
    users,
    total,
    page: page,
    totalPages: Math.ceil(total / limit),
  });
});

exports.getUserDetail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-passwordHash -sessionToken -resetPasswordToken -resetPasswordExpires')
    .populate('organization', 'name plan slug isLocked');
  if (!user) return res.status(404).json({ message: 'User not found' });

  const projects = await Project.find({ members: user._id })
    .select('name projectType websiteUrl status organization createdAt')
    .populate('organization', 'name');

  res.json({ user, projects });
});

// ── Projects ─────────────────────────────────────────────────────

exports.getProjects = asyncHandler(async (req, res) => {
  const { orgId, status, projectStatus, type } = req.query;
  const { page, limit } = parsePaging(req.query);
  const skip = (page - 1) * limit;

  const filter = {};
  if (orgId) filter.organization = orgId;
  if (status) filter.status = status;
  if (projectStatus) filter.projectStatus = projectStatus;
  if (type) filter.projectType = type;

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name projectType websiteUrl status projectStatus members organization createdAt')
      .populate('organization', 'name plan'),
    Project.countDocuments(filter),
  ]);

  // Batch pin stats
  const projectIds = projects.map(p => p._id);
  const pinStats = await Pin.aggregate([
    { $match: { project: { $in: projectIds } } },
    {
      $group: {
        _id: '$project',
        total: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
      },
    },
  ]);

  const pinMap = {};
  for (const p of pinStats) { pinMap[p._id.toString()] = { total: p.total, resolved: p.resolved }; }

  const data = projects.map(proj => ({
    ...proj.toObject(),
    pinStats: pinMap[proj._id.toString()] || { total: 0, resolved: 0 },
    memberCount: proj.members ? proj.members.length : 0,
  }));

  res.json({
    projects: data,
    total,
    page: page,
    totalPages: Math.ceil(total / limit),
  });
});

// ── Plans Management ─────────────────────────────────────────────

exports.getPlans = asyncHandler(async (req, res) => {
  const plans = await getPlansWithOverrides();
  res.json({ plans });
});

exports.updatePlan = asyncHandler(async (req, res) => {
  const { planId } = req.params;
  const b = req.body || {};

  if (!PLANS[planId]) {
    return res.status(404).json({ message: 'Plan not found' });
  }

  const $set = {};

  const numOrNull = (v) => {
    if (v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const numOrSkip = (v) => {
    if (v === null || v === '' || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  // Limits
  if (b.maxProjects !== undefined) {
    const n = numOrSkip(b.maxProjects);
    if (n !== undefined) $set['limits.maxProjects'] = n;
  }
  if (b.maxMembers !== undefined) {
    const n = numOrSkip(b.maxMembers);
    if (n !== undefined) $set['limits.maxMembers'] = n;
  }
  if (b.maxGuests !== undefined) {
    const n = numOrSkip(b.maxGuests);
    if (n !== undefined) $set['limits.maxGuests'] = n;
  }
  if (b.maxStorageMB !== undefined) {
    const n = numOrSkip(b.maxStorageMB);
    if (n !== undefined) $set['limits.maxStorageMB'] = n;
  }
  if (b.hasIntegrations !== undefined) {
    $set['limits.hasIntegrations'] = !!b.hasIntegrations;
  }
  if (b.hasActivityLogs !== undefined) {
    $set['limits.hasActivityLogs'] = !!b.hasActivityLogs;
  }
  if (b.hasVersionHistory !== undefined) {
    $set['limits.hasVersionHistory'] = !!b.hasVersionHistory;
  }

  // Display fields
  if (b.name !== undefined) $set.name = String(b.name).slice(0, 60);
  // price: accept null (= "Custom"); otherwise number
  if (b.price !== undefined) $set.price = numOrNull(b.price);
  // INR price for Razorpay; null = derive from the USD price
  if (b.priceInr !== undefined) $set.priceInr = numOrNull(b.priceInr);
  if (b.priceLabel !== undefined) $set.priceLabel = String(b.priceLabel).slice(0, 40);
  if (b.period !== undefined) $set.period = String(b.period).slice(0, 40);
  if (b.popular !== undefined) $set.popular = !!b.popular;
  if (b.badgeColor !== undefined) $set.badgeColor = String(b.badgeColor).slice(0, 20);
  if (b.order !== undefined) {
    const n = numOrSkip(b.order);
    if (n !== undefined) $set.order = n;
  }
  if (b.razorpayPlanId !== undefined) {
    $set.razorpayPlanId = b.razorpayPlanId ? String(b.razorpayPlanId).trim() : null;
  }
  // Only the free plan can be marked as the default for new signups; ignore on others.
  if (b.assignToNewSignups !== undefined && planId === 'free') {
    $set.assignToNewSignups = !!b.assignToNewSignups;
  }
  if (Array.isArray(b.features)) {
    $set.features = b.features
      .map((f) => String(f).slice(0, 200).trim())
      .filter((f) => f.length > 0);
  }

  await PlanConfig.findOneAndUpdate(
    { planId },
    { $set },
    { upsert: true, returnDocument: 'after' },
  );

  clearPlanCache();
  const plans = await getPlansWithOverrides();
  res.json({ plans });
});

exports.togglePlan = asyncHandler(async (req, res) => {
  const { planId } = req.params;

  if (!PLANS[planId]) {
    return res.status(404).json({ message: 'Plan not found' });
  }

  const existing = await PlanConfig.findOne({ planId });
  const newEnabled = existing ? !existing.enabled : false;

  await PlanConfig.findOneAndUpdate(
    { planId },
    { $set: { enabled: newEnabled } },
    { upsert: true },
  );

  clearPlanCache();
  const plans = await getPlansWithOverrides();
  res.json({ plans });
});

// ── Payment Settings ─────────────────────────────────────────────

exports.getPaymentSettings = asyncHandler(async (req, res) => {
  const status = await getProviderStatus();
  res.json(status);
});

exports.updatePaymentSettings = asyncHandler(async (req, res) => {
  const { activeProvider, providers, allowDowngrades } = req.body || {};

  const VALID = ['razorpay', 'paypal'];
  const $set = {};

  if (providers && typeof providers === 'object') {
    for (const id of VALID) {
      if (providers[id] && typeof providers[id].enabled === 'boolean') {
        $set[`providers.${id}.enabled`] = providers[id].enabled;
      }
    }
  }

  if (typeof allowDowngrades === 'boolean') {
    $set.allowDowngrades = allowDowngrades;
  }

  if (activeProvider !== undefined) {
    if (activeProvider !== null && !VALID.includes(activeProvider)) {
      return res.status(400).json({ message: `Invalid activeProvider. Use null or one of: ${VALID.join(', ')}` });
    }
    if (activeProvider !== null) {
      const enabledNow = $set[`providers.${activeProvider}.enabled`];
      const provider = getProvider(activeProvider);
      if (!provider || !provider.isConfigured()) {
        return res.status(400).json({ message: `${activeProvider} is not configured. Set the required env vars first.` });
      }
      if (enabledNow === false) {
        return res.status(400).json({ message: `Cannot activate ${activeProvider} while it is disabled.` });
      }
      if (enabledNow === undefined) {
        const current = await PaymentSettings.getSingleton();
        if (!current.providers?.[activeProvider]?.enabled) {
          return res.status(400).json({ message: `Cannot activate ${activeProvider} while it is disabled.` });
        }
      }
    }
    $set.activeProvider = activeProvider;
  }

  await PaymentSettings.findOneAndUpdate(
    { key: 'default' },
    { $set },
    { upsert: true, returnDocument: 'after' }
  );

  clearPaymentSettingsCache();
  const status = await getProviderStatus();
  res.json(status);
});

// ── Billing administration ─────────────────────────────────────

const ADMIN_PLANS = ['free', 'trial', 'starter', 'pro', 'enterprise'];

/**
 * PATCH /api/admin/organizations/:id/plan  { plan, periodEnd? }
 * Set an org's plan without payment (enterprise deals, comps, corrections).
 * Starter/Pro set this way are invoiced normally from periodEnd onwards.
 */
exports.setOrganizationPlan = asyncHandler(async (req, res) => {
  const { plan, periodEnd } = req.body || {};
  if (!ADMIN_PLANS.includes(plan)) {
    return res.status(400).json({ message: `Plan must be one of: ${ADMIN_PLANS.join(', ')}` });
  }
  const org = await Organization.findById(req.params.id);
  if (!org) return res.status(404).json({ message: 'Organization not found' });

  const previousPlan = org.plan;
  org.plan = plan;
  org.limits = await getLimitsForPlanAsync(plan);
  if (!org.subscription) org.subscription = {};
  org.subscription.cancelAtPeriodEnd = false;
  if (plan === 'trial') {
    org.trialEndsAt = org.trialEndsAt && org.trialEndsAt > new Date() ? org.trialEndsAt : addMonthsUTC(new Date(), 1);
    org.subscription.status = 'none';
    org.subscription.currentPeriodEnd = null;
  } else {
    org.trialEndsAt = null;
    org.subscription.status = 'active';
    if (plan === 'free' || plan === 'enterprise') {
      org.subscription.currentPeriodEnd = null;
    } else {
      const end = periodEnd ? new Date(periodEnd) : addMonthsUTC(new Date(), 1);
      if (Number.isNaN(end.getTime())) return res.status(400).json({ message: 'Invalid periodEnd date' });
      org.subscription.currentPeriodEnd = end;
    }
  }
  clearBillingLock(org);
  await org.save();
  if (plan === 'free' || plan === 'enterprise' || plan === 'trial') {
    await Invoice.updateMany({ organization: org._id, status: 'pending' }, { $set: { status: 'void' } });
  }

  logOrgActivity(org._id, req.user._id, 'org.plan_set_by_admin', { from: previousPlan, to: plan, actorRole: 'superadmin' });
  res.json({ organization: org });
});

/**
 * POST /api/admin/organizations/:id/extend-trial  { days }
 */
exports.extendTrial = asyncHandler(async (req, res) => {
  const days = parseInt(req.body?.days, 10);
  if (!Number.isFinite(days) || days < 1 || days > 365) {
    return res.status(400).json({ message: 'days must be between 1 and 365' });
  }
  const org = await Organization.findById(req.params.id);
  if (!org) return res.status(404).json({ message: 'Organization not found' });
  if (org.plan !== 'trial') return res.status(400).json({ message: 'Organization is not on a trial' });

  const from = org.trialEndsAt && org.trialEndsAt > new Date() ? org.trialEndsAt : new Date();
  org.trialEndsAt = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  // Re-arm reminder emails for the new end date and lift a trial-expiry lock
  org.trialReminders = { day7Sent: false, day3Sent: false, day1Sent: false, expiredSent: false };
  clearBillingLock(org);
  await org.save();

  logOrgActivity(org._id, req.user._id, 'org.trial_extended', { days, trialEndsAt: org.trialEndsAt, actorRole: 'superadmin' });
  res.json({ organization: org });
});

/**
 * PATCH /api/admin/organizations/:id/limits  { maxProjects?, maxMembers?, ... }
 * Per-org overrides on top of the plan; null/'' clears a key back to the plan value.
 */
exports.setOrganizationLimits = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id);
  if (!org) return res.status(404).json({ message: 'Organization not found' });
  const b = req.body || {};
  const overrides = {};
  for (const key of ['maxProjects', 'maxWorkspaces', 'maxMembers', 'maxGuests', 'maxStorageMB']) {
    if (b[key] === null || b[key] === '' || b[key] === undefined) continue;
    const n = Number(b[key]);
    if (!Number.isInteger(n) || n < 0) return res.status(400).json({ message: `${key} must be a whole number` });
    overrides[key] = n;
  }
  for (const key of ['hasIntegrations', 'hasActivityLogs', 'hasVersionHistory']) {
    if (typeof b[key] === 'boolean') overrides[key] = b[key];
  }
  org.limitOverrides = overrides;
  await org.save();
  logOrgActivity(org._id, req.user._id, 'org.limits_overridden', { overrides, actorRole: 'superadmin' });
  res.json({ organization: org });
});

/**
 * POST /api/admin/invoices/:id/refund
 * Full refund through the invoice's payment provider; the plan is revoked if
 * the invoice pays for the current period. The provider's webhook that follows
 * is a no-op.
 */
exports.refundInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  if (invoice.status !== 'paid') return res.status(400).json({ message: 'Only paid invoices can be refunded' });

  const provider = getProvider(invoice.provider);
  if (!provider || typeof provider.refundPayment !== 'function') {
    return res.status(400).json({ message: `Refunds are not supported for ${invoice.provider}` });
  }
  try {
    await provider.refundPayment(invoice);
  } catch (err) {
    console.error(`[admin] refund of invoice ${invoice._id} failed:`, err.message);
    return res.status(502).json({ message: `The payment provider rejected the refund: ${err.message}` });
  }
  const result = await applyRefund(invoice, invoice.amount);
  logOrgActivity(invoice.organization, req.user._id, 'org.invoice_refunded', {
    invoiceId: String(invoice._id), amount: invoice.amount, currency: invoice.currency, actorRole: 'superadmin',
  });
  res.json({ invoice, downgraded: !!result.downgraded });
});
