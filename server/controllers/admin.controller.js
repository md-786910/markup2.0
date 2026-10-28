const User = require('../models/User');
const Organization = require('../models/Organization');
const Project = require('../models/Project');
const Pin = require('../models/Pin');
const Activity = require('../models/Activity');
const PlanConfig = require('../models/PlanConfig');
const Invoice = require('../models/Invoice');
const Comment = require('../models/Comment');
const Workspace = require('../models/Workspace');
const Invitation = require('../models/Invitation');
const AdminNote = require('../models/AdminNote');
const SupportTicket = require('../models/SupportTicket');
const PaymentSettings = require('../models/PaymentSettings');
const asyncHandler = require('../utils/asyncHandler');
const { PLANS, getPlansWithOverrides, clearPlanCache, getLimitsForPlanAsync, getEffectiveLimitsAsync } = require('../config/plans');
const {
  getProvider,
  getProviderStatus,
  clearPaymentSettingsCache,
} = require('../payments');
const { logAdminAction } = require('../utils/activityLogger');
const { clearBillingLock } = require('../utils/orgUtils');
const { addMonthsUTC } = require('../utils/billingDates');
const { applyRefund } = require('../payments/refundInvoice');

// Page/limit from the query string, clamped so a request can't pull a whole collection
function parsePaging(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit };
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Plans billed monthly at a list price; enterprise is a custom deal
const PRICED_PLANS = ['starter', 'pro'];

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Monthly revenue of an org at its plan's list price (USD), 0 unless it pays
function monthlyRevenue(org, plans) {
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

// Last activity and active people per org, from the members' lastSeen
async function engagementByOrg(orgIds) {
  const since7 = new Date(Date.now() - 7 * DAY_MS);
  const rows = await User.aggregate([
    { $match: { organization: { $in: orgIds } } },
    {
      $group: {
        _id: '$organization',
        members: { $sum: 1 },
        lastActiveAt: { $max: '$lastSeen' },
        active7d: { $sum: { $cond: [{ $gte: ['$lastSeen', since7] }, 1, 0] } },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
}

// Mongo filter for the customer list's status filter. Mirrors lifecycleStatus:
// deletion and lock come first, so the other statuses exclude those orgs.
async function statusFilter(status) {
  const now = new Date();
  const notDeleting = { deletionScheduledAt: null };
  const live = { ...notDeleting, isLocked: { $ne: true } };
  const inSevenDays = new Date(now.getTime() + 7 * DAY_MS);
  switch (status) {
    case 'deleting': return { deletionScheduledAt: { $ne: null } };
    case 'locked': return { ...notDeleting, isLocked: true };
    case 'trial': return { ...live, plan: 'trial', $or: [{ trialEndsAt: null }, { trialEndsAt: { $gt: inSevenDays } }] };
    case 'trial_ending': return { ...live, plan: 'trial', trialEndsAt: { $lte: inSevenDays } };
    case 'cancelling': return { ...live, plan: { $ne: 'trial' }, 'subscription.cancelAtPeriodEnd': true };
    case 'free': return { ...live, plan: 'free', 'subscription.cancelAtPeriodEnd': { $ne: true } };
    case 'paying': return { ...live, plan: { $in: [...PRICED_PLANS, 'enterprise'] }, 'subscription.status': 'active', 'subscription.cancelAtPeriodEnd': { $ne: true } };
    case 'unpaid': return { _id: { $in: await Invoice.distinct('organization', { status: 'pending' }) } };
    default: return {};
  }
}

// ── Dashboard Stats ──────────────────────────────────────────────

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const inSevenDays = new Date(now.getTime() + 7 * DAY_MS);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    plans,
    totalUsers,
    activeUsers,
    totalOrgs,
    newOrgs30d,
    planBreakdown,
    payingOrgs,
    activeOrgIds,
    unpaid,
    trialsEnding,
    overdueInvoices,
    lockedOrgs,
    recentSignups,
    monthlySignups,
    recentAdminActions,
    totalProjects,
  ] = await Promise.all([
    getPlansWithOverrides(),
    User.countDocuments({ role: { $ne: 'superadmin' } }),
    User.countDocuments({ lastSeen: { $gte: sevenDaysAgo }, role: { $ne: 'superadmin' } }),
    Organization.countDocuments(),
    Organization.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Organization.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
    Organization.find({ plan: { $in: [...PRICED_PLANS, 'enterprise'] }, 'subscription.status': 'active' })
      .select('plan subscription').lean(),
    User.distinct('organization', { lastSeen: { $gte: sevenDaysAgo }, organization: { $ne: null } }),
    Invoice.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: '$currency', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
    Organization.find({ plan: 'trial', trialEndsAt: { $gte: now, $lte: inSevenDays } })
      .sort({ trialEndsAt: 1 }).limit(8)
      .select('name plan trialEndsAt owner').populate('owner', 'name email').lean(),
    Invoice.find({ status: 'pending', dueAt: { $lt: now } })
      .sort({ dueAt: 1 }).limit(8)
      .select('organization amount currency dueAt plan invoiceNumber')
      .populate('organization', 'name plan').lean(),
    Organization.find({ isLocked: true, deletionScheduledAt: null })
      .sort({ lockedAt: -1 }).limit(5)
      .select('name plan lockedAt lockedReason').lean(),
    User.find({ role: { $ne: 'superadmin' } })
      .sort({ createdAt: -1 }).limit(8)
      .select('name email role createdAt organization')
      .populate('organization', 'name plan'),
    User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, role: { $ne: 'superadmin' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Activity.find({ 'metadata.actorRole': 'superadmin' })
      .sort({ createdAt: -1 }).limit(8)
      .populate('actor', 'name email')
      .populate('adminActor', 'name email')
      .populate('organization', 'name')
      .lean(),
    Project.countDocuments(),
  ]);

  // Last active per org in the trials-ending list
  const engagement = await engagementByOrg(trialsEnding.map((o) => o._id));

  // Support: open requests and the ones past their first-reply target
  const overdueTicketFilter = { status: 'open', firstResponseAt: null, dueAt: { $ne: null, $lt: now } };
  const [openTickets, overdueTicketCount, overdueTickets] = await Promise.all([
    SupportTicket.countDocuments({ status: 'open' }),
    SupportTicket.countDocuments(overdueTicketFilter),
    SupportTicket.find(overdueTicketFilter).sort({ priorityRank: 1, dueAt: 1 }).limit(5)
      .select('number subject priority dueAt organization').populate('organization', 'name').lean(),
  ]);

  const planMap = {};
  for (const p of planBreakdown) planMap[p._id || 'none'] = p.count;

  res.json({
    kpis: {
      mrr: payingOrgs.reduce((sum, org) => sum + monthlyRevenue(org, plans), 0),
      payingOrgs: payingOrgs.length,
      activeTrials: planMap.trial || 0,
      trialsEnding7d: await Organization.countDocuments({ plan: 'trial', trialEndsAt: { $gte: now, $lte: inSevenDays } }),
      activeOrgs7d: activeOrgIds.length,
      totalOrgs,
      newOrgs30d,
      totalUsers,
      activeUsers,
      totalProjects,
      lockedOrgs: await Organization.countDocuments({ isLocked: true }),
      unpaidInvoices: unpaid.map((u) => ({ currency: u._id, count: u.count, amount: u.amount })),
      openTickets,
      overdueTickets: overdueTicketCount,
    },
    planBreakdown: planMap,
    monthlySignups,
    attention: {
      trialsEnding: trialsEnding.map((o) => ({
        ...o,
        lastActiveAt: engagement.get(String(o._id))?.lastActiveAt || null,
      })),
      overdueInvoices,
      lockedOrgs,
      overdueTickets,
    },
    recentSignups,
    recentAdminActions,
  });
});

// ── Organizations ────────────────────────────────────────────────

const ORG_SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  trial_end: { trialEndsAt: 1 },
};

exports.getOrganizations = asyncHandler(async (req, res) => {
  const { plan, status, search, sort, format } = req.query;
  const csv = format === 'csv';
  const { page, limit } = csv ? { page: 1, limit: 5000 } : parsePaging(req.query);
  const skip = (page - 1) * limit;

  const filter = { ...(await statusFilter(status)) };
  if (plan) filter.plan = String(plan);
  if (search) {
    const re = new RegExp(escapeRegex(String(search).slice(0, 100)), 'i');
    const owners = await User.find({ $or: [{ email: re }, { name: re }] }).select('_id').limit(200).lean();
    filter.$or = [
      { name: re },
      { slug: re },
      { owner: { $in: owners.map((u) => u._id) } },
    ];
  }

  const [orgs, total, plans] = await Promise.all([
    Organization.find(filter)
      .sort(ORG_SORTS[sort] || ORG_SORTS.newest)
      .skip(skip)
      .limit(limit)
      .populate('owner', 'name email')
      .lean(),
    Organization.countDocuments(filter),
    getPlansWithOverrides(),
  ]);

  const orgIds = orgs.map((o) => o._id);
  const [engagement, projectCounts, unpaidOrgIds] = await Promise.all([
    engagementByOrg(orgIds),
    Project.aggregate([
      { $match: { organization: { $in: orgIds } } },
      { $group: { _id: '$organization', count: { $sum: 1 } } },
    ]),
    Invoice.distinct('organization', { organization: { $in: orgIds }, status: 'pending' }),
  ]);
  const projectMap = new Map(projectCounts.map((p) => [String(p._id), p.count]));
  const unpaidSet = new Set(unpaidOrgIds.map(String));

  const now = Date.now();
  const data = orgs.map((org) => {
    const e = engagement.get(String(org._id));
    return {
      _id: org._id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      owner: org.owner,
      plan: org.plan,
      status: lifecycleStatus(org, now),
      isLocked: org.isLocked,
      trialEndsAt: org.trialEndsAt,
      subscription: org.subscription,
      createdAt: org.createdAt,
      memberCount: e?.members || 0,
      activeMembers7d: e?.active7d || 0,
      lastActiveAt: e?.lastActiveAt || null,
      projectCount: projectMap.get(String(org._id)) || 0,
      mrr: monthlyRevenue(org, plans),
      hasUnpaidInvoice: unpaidSet.has(String(org._id)),
    };
  });

  if (csv) {
    const cell = (v) => {
      const s = v == null ? '' : String(v);
      // Quote, and defuse spreadsheet formulas in customer-entered text
      return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
    };
    const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
    const header = ['Organization', 'Owner', 'Owner email', 'Plan', 'Status', 'Members', 'Active members (7d)', 'Projects', 'MRR (USD)', 'Last active', 'Trial ends', 'Created'];
    const lines = data.map((o) => [
      o.name, o.owner?.name, o.owner?.email, o.plan, o.status, o.memberCount, o.activeMembers7d,
      o.projectCount, o.mrr, iso(o.lastActiveAt), iso(o.trialEndsAt), iso(o.createdAt),
    ].map(cell).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kommently-customers-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send([header.map(cell).join(','), ...lines].join('\n'));
  }

  res.json({
    organizations: data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

exports.getOrganizationDetail = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id).populate('owner', 'name email');
  if (!org) return res.status(404).json({ message: 'Organization not found' });

  const now = Date.now();
  const since7 = new Date(now - 7 * DAY_MS);
  const since30 = new Date(now - 30 * DAY_MS);

  const [members, projects, workspaces, invoices, invitations, notes, activity, limits, plans] = await Promise.all([
    User.find({ organization: org._id })
      .select('name email role lastSeen avatar createdAt lastLoginLocation')
      .sort({ createdAt: 1 }).lean(),
    Project.find({ organization: org._id })
      .select('name projectType websiteUrl status projectStatus members workspace createdAt updatedAt shareSettings.enabled documents.originalName')
      .sort({ updatedAt: -1 }).lean(),
    Workspace.find({ organization: org._id })
      .select('name isDefault members shareSettings.enabled createdAt').lean(),
    // Invoice does not store any provider secrets, safe to return as-is.
    // Do NOT add credentials to this projection if Invoice schema ever grows.
    Invoice.find({ organization: org._id }).sort({ createdAt: -1 }).lean(),
    Invitation.find({ organization: org._id, status: 'pending', expiresAt: { $gt: new Date() } })
      .select('email role level project workspace createdAt expiresAt').lean(),
    AdminNote.find({ organization: org._id })
      .sort({ pinned: -1, createdAt: -1 })
      .populate('author', 'name email').lean(),
    Activity.find({ organization: org._id })
      .sort({ createdAt: -1 }).limit(50)
      .populate('actor', 'name email')
      .populate('adminActor', 'name email')
      .populate('project', 'name').lean(),
    getEffectiveLimitsAsync(org),
    getPlansWithOverrides(),
  ]);

  const projectIds = projects.map((p) => p._id);
  const pinIds = await Pin.find({ project: { $in: projectIds } }).distinct('_id');
  const [pinStats, pins30d, comments30d, guestReviewers] = await Promise.all([
    Pin.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: null, total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } } } },
    ]),
    Pin.countDocuments({ project: { $in: projectIds }, createdAt: { $gte: since30 } }),
    Comment.countDocuments({ pin: { $in: pinIds }, createdAt: { $gte: since30 } }),
    Comment.distinct('authorGuest.email', { pin: { $in: pinIds }, 'authorGuest.email': { $ne: null } }),
  ]);

  // Projects per workspace (null = the default one)
  const defaultWs = workspaces.find((w) => w.isDefault);
  const wsProjectCount = {};
  for (const p of projects) {
    const key = String(p.workspace || defaultWs?._id || 'default');
    wsProjectCount[key] = (wsProjectCount[key] || 0) + 1;
  }

  const lastActiveAt = members.reduce((max, m) => (m.lastSeen && (!max || m.lastSeen > max) ? m.lastSeen : max), null);

  res.json({
    organization: org,
    status: lifecycleStatus(org, now),
    mrr: monthlyRevenue(org, plans),
    limits,
    usage: {
      projects: projects.filter((p) => p.status === 'active').length,
      archivedProjects: projects.filter((p) => p.status === 'archived').length,
      workspaces: workspaces.length,
      members: members.filter((m) => m.role !== 'guest').length + invitations.filter((i) => i.role !== 'guest').length,
      guests: members.filter((m) => m.role === 'guest').length + invitations.filter((i) => i.role === 'guest').length,
      storageMB: Math.round(((org.storageUsedBytes || 0) / 1048576) * 10) / 10,
    },
    engagement: {
      lastActiveAt,
      activeMembers7d: members.filter((m) => m.lastSeen && m.lastSeen >= since7).length,
      activeMembers30d: members.filter((m) => m.lastSeen && m.lastSeen >= since30).length,
      pins30d,
      comments30d,
      guestReviewers: guestReviewers.length,
      shareLinks: projects.filter((p) => p.shareSettings?.enabled).length + workspaces.filter((w) => w.shareSettings?.enabled).length,
    },
    members,
    projects,
    workspaces: workspaces.map((w) => ({
      _id: w._id,
      name: w.name,
      isDefault: w.isDefault,
      memberCount: w.members?.length || 0,
      shared: !!w.shareSettings?.enabled,
      projectCount: wsProjectCount[String(w._id)] || 0,
    })),
    invitations,
    pinStats: pinStats[0] || { total: 0, resolved: 0 },
    invoices,
    notes,
    activity,
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
  logAdminAction(org._id, req.admin, 'org.locked', { reason: org.lockedReason });
  res.json({ organization: org });
});

exports.unlockOrganization = asyncHandler(async (req, res) => {
  const org = await Organization.findByIdAndUpdate(
    req.params.id,
    { isLocked: false, lockedAt: null, lockedReason: null },
    { returnDocument: 'after' },
  );
  if (!org) return res.status(404).json({ message: 'Organization not found' });
  logAdminAction(org._id, req.admin, 'org.unlocked');
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
    const re = new RegExp(escapeRegex(String(search).slice(0, 100)), 'i');
    filter.$or = [{ name: re }, { email: re }];
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
  if (b.price !== undefined) $set.price = planId === 'free' ? 0 : numOrNull(b.price);
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

  logAdminAction(org._id, req.admin, 'org.plan_set_by_admin', { from: previousPlan, to: plan });
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

  logAdminAction(org._id, req.admin, 'org.trial_extended', { days, trialEndsAt: org.trialEndsAt });
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
  logAdminAction(org._id, req.admin, 'org.limits_overridden', { overrides });
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
  logAdminAction(invoice.organization, req.admin, 'org.invoice_refunded', {
    invoiceId: String(invoice._id), amount: invoice.amount, currency: invoice.currency,
  });
  res.json({ invoice, downgraded: !!result.downgraded });
});

// ── Internal notes ───────────────────────────────────────────────

exports.addOrganizationNote = asyncHandler(async (req, res) => {
  const body = String(req.body?.body || '').trim();
  if (!body) return res.status(400).json({ message: 'Write a note first' });
  if (body.length > 4000) return res.status(400).json({ message: 'Notes can be up to 4000 characters' });
  const org = await Organization.exists({ _id: req.params.id });
  if (!org) return res.status(404).json({ message: 'Organization not found' });
  const note = await AdminNote.create({ organization: req.params.id, author: req.admin._id, body });
  await note.populate('author', 'name email');
  res.status(201).json({ note });
});

exports.updateOrganizationNote = asyncHandler(async (req, res) => {
  const note = await AdminNote.findOneAndUpdate(
    { _id: req.params.noteId, organization: req.params.id },
    { $set: { pinned: !!req.body?.pinned } },
    { returnDocument: 'after' },
  ).populate('author', 'name email');
  if (!note) return res.status(404).json({ message: 'Note not found' });
  res.json({ note });
});

exports.deleteOrganizationNote = asyncHandler(async (req, res) => {
  const result = await AdminNote.deleteOne({ _id: req.params.noteId, organization: req.params.id });
  if (!result.deletedCount) return res.status(404).json({ message: 'Note not found' });
  res.json({ message: 'Note deleted' });
});

// ── Admin action log ─────────────────────────────────────────────

exports.getAuditLog = asyncHandler(async (req, res) => {
  const { page, limit } = parsePaging(req.query);
  const filter = { 'metadata.actorRole': 'superadmin' };
  if (req.query.orgId) filter.organization = req.query.orgId;
  const [entries, total] = await Promise.all([
    Activity.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('actor', 'name email')
      .populate('adminActor', 'name email')
      .populate('organization', 'name plan')
      .lean(),
    Activity.countDocuments(filter),
  ]);
  res.json({ entries, total, page, totalPages: Math.ceil(total / limit) });
});
