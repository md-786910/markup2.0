const mongoose = require('mongoose');
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
const AdminUser = require('../models/AdminUser');
const SupportTicket = require('../models/SupportTicket');
const PaymentSettings = require('../models/PaymentSettings');
const asyncHandler = require('../utils/asyncHandler');
const { PLANS, getPlansWithOverrides, clearPlanCache, clearTrialCache, getDefaultTrialDaysAsync, getLimitsForPlanAsync, getEffectiveLimitsAsync, getSupportForOrg, getSupportForPlan, USD_INR_RATE, DEFAULT_TRIAL_DAYS } = require('../config/plans');
const { PRICED_PLANS, activeDeal, monthlyRevenue, lifecycleStatus } = require('../utils/orgStatus');
const {
  getProvider,
  getProviderStatus,
  clearPaymentSettingsCache,
} = require('../payments');
const { logAdminAction } = require('../utils/activityLogger');
const { clearBillingLock } = require('../utils/orgUtils');
const { addMonthsUTC } = require('../utils/billingDates');
const { applyRefund } = require('../payments/refundInvoice');
const { getOrgPosthogData } = require('../utils/posthog');

// Page/limit from the query string, clamped so a request can't pull a whole collection
function parsePaging(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      .select('plan subscription deal').lean(),
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

  // At-risk paying/trial organizations needing retention attention
  const atRiskOrgs = await Organization.find({
    'health.band': 'at_risk',
    plan: { $in: [...PRICED_PLANS, 'enterprise', 'trial'] },
    deletionScheduledAt: null,
    isLocked: { $ne: true },
  })
    .sort({ 'health.score': 1, createdAt: -1 })
    .limit(8)
    .select('name plan health owner createdAt')
    .populate('owner', 'name email')
    .lean();

  // 30-day signup to activation funnel
  const recentOrgs = await Organization.find({ createdAt: { $gte: thirtyDaysAgo } }).select('_id plan').lean();
  const recentOrgIds = recentOrgs.map((o) => o._id);
  const signedUp = recentOrgIds.length;

  let createdProject = 0;
  let droppedPin = 0;
  let invitedMember = 0;
  let sharedLink = 0;
  let convertedPaid = 0;

  if (recentOrgIds.length > 0) {
    const [projectOrgIds, memberAgg, sharedOrgIds, paidCount] = await Promise.all([
      Project.distinct('organization', { organization: { $in: recentOrgIds } }),
      User.aggregate([
        { $match: { organization: { $in: recentOrgIds } } },
        { $group: { _id: '$organization', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
      ]),
      Project.distinct('organization', { organization: { $in: recentOrgIds }, 'shareSettings.enabled': true }),
      Organization.countDocuments({
        _id: { $in: recentOrgIds },
        plan: { $in: [...PRICED_PLANS, 'enterprise'] },
      }),
    ]);

    createdProject = projectOrgIds.length;
    invitedMember = memberAgg.length;
    sharedLink = sharedOrgIds.length;
    convertedPaid = paidCount;

    if (projectOrgIds.length > 0) {
      const projectsForOrgs = await Project.find({ organization: { $in: recentOrgIds } }).select('_id organization').lean();
      const projToOrg = new Map(projectsForOrgs.map((p) => [String(p._id), String(p.organization)]));
      const pinProjects = await Pin.distinct('project', { project: { $in: projectsForOrgs.map((p) => p._id) } });
      const pinOrgSet = new Set(pinProjects.map((pId) => projToOrg.get(String(pId))).filter(Boolean));
      droppedPin = pinOrgSet.size;
    }
  }

  const activationFunnel = {
    periodDays: 30,
    steps: [
      { key: 'signed_up', label: 'Signed up', count: signedUp, conversionRate: 100 },
      { key: 'created_project', label: 'Created project', count: createdProject, conversionRate: signedUp ? Math.round((createdProject / signedUp) * 100) : 0 },
      { key: 'dropped_pin', label: 'Dropped first pin', count: droppedPin, conversionRate: signedUp ? Math.round((droppedPin / signedUp) * 100) : 0 },
      { key: 'invited_member', label: 'Invited team member', count: invitedMember, conversionRate: signedUp ? Math.round((invitedMember / signedUp) * 100) : 0 },
      { key: 'shared_link', label: 'Shared guest link', count: sharedLink, conversionRate: signedUp ? Math.round((sharedLink / signedUp) * 100) : 0 },
      { key: 'converted_paid', label: 'Converted to paid', count: convertedPaid, conversionRate: signedUp ? Math.round((convertedPaid / signedUp) * 100) : 0 },
    ],
  };

  res.json({
    kpis: {
      mrr: payingOrgs.reduce((sum, org) => sum + monthlyRevenue(org, plans), 0),
      payingOrgs: payingOrgs.length,
      // Trials still running: expired trials stay on plan 'trial' but are locked
      activeTrials: await Organization.countDocuments({ plan: 'trial', isLocked: { $ne: true }, deletionScheduledAt: null, $or: [{ trialEndsAt: null }, { trialEndsAt: { $gt: now } }] }),
      trialsEnding7d: await Organization.countDocuments({ plan: 'trial', trialEndsAt: { $gte: now, $lte: inSevenDays } }),
      activeOrgs7d: activeOrgIds.length,
      totalOrgs,
      newOrgs30d,
      totalUsers,
      activeUsers,
      totalProjects,
      lockedOrgs: await Organization.countDocuments({ isLocked: true, deletionScheduledAt: null }),
      unpaidInvoices: unpaid.map((u) => ({ currency: u._id, count: u.count, amount: u.amount })),
      openTickets,
      overdueTickets: overdueTicketCount,
    },
    planBreakdown: planMap,
    monthlySignups,
    attention: {
      atRiskOrgs,
      trialsEnding: trialsEnding.map((o) => ({
        ...o,
        lastActiveAt: engagement.get(String(o._id))?.lastActiveAt || null,
      })),
      overdueInvoices,
      lockedOrgs,
      overdueTickets,
    },
    activationFunnel,
    recentSignups,
    recentAdminActions,
  });
});

// ── Organizations ────────────────────────────────────────────────

// _id breaks ties, so pages (and CSV batches) never repeat or skip a row
const ORG_SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name: { name: 1, _id: 1 },
  trial_end: { trialEndsAt: 1, _id: 1 },
  health: { 'health.score': 1, _id: 1 },
  health_desc: { 'health.score': -1, _id: -1 },
};

exports.getOrganizations = asyncHandler(async (req, res) => {
  const { plan, status, health, search, sort, format } = req.query;
  const csv = format === 'csv';
  const { page, limit } = parsePaging(req.query);

  const filter = { ...(await statusFilter(status)) };
  if (plan) filter.plan = String(plan);
  if (health && ['healthy', 'watch', 'at_risk'].includes(health)) {
    filter['health.band'] = health;
  }
  if (search) {
    const re = new RegExp(escapeRegex(String(search).slice(0, 100)), 'i');
    const owners = await User.find({ $or: [{ email: re }, { name: re }] }).select('_id').limit(200).lean();
    // In $and: the trial status filter has an $or of its own
    filter.$and = [{ $or: [
      { name: re },
      { slug: re },
      { owner: { $in: owners.map((u) => u._id) } },
    ] }];
  }

  // An ascending sort puts organizations without a trial end first; those go last
  const findOrgs = (skip, limit) => (sort === 'trial_end'
    ? Organization.aggregate([
      { $match: filter },
      { $addFields: { noTrialEnd: { $cond: [{ $ifNull: ['$trialEndsAt', false] }, 0, 1] } } },
      { $sort: { noTrialEnd: 1, trialEndsAt: 1, _id: 1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { noTrialEnd: 0 } },
    ]).then((rows) => Organization.populate(rows, { path: 'owner', select: 'name email' }))
    : Organization.find(filter)
      .sort(ORG_SORTS[sort] || ORG_SORTS.newest)
      .skip(skip)
      .limit(limit)
      .populate('owner', 'name email')
      .lean());

  const plans = await getPlansWithOverrides();

  // CSV: every matching organization, read in batches
  if (csv) {
    const BATCH = 500;
    const rows = [];
    for (let skip = 0; ; skip += BATCH) {
      const batch = await findOrgs(skip, BATCH);
      rows.push(...(await describeOrgs(batch, plans)));
      if (batch.length < BATCH) break;
    }
    return sendOrganizationsCsv(res, rows);
  }

  const [orgs, total] = await Promise.all([
    findOrgs((page - 1) * limit, limit),
    Organization.countDocuments(filter),
  ]);
  const data = await describeOrgs(orgs, plans);

  res.json({
    organizations: data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// Rows of the customer list: engagement, project counts, unpaid invoices
async function describeOrgs(orgs, plans) {
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
  return orgs.map((org) => {
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
      health: org.health || { score: 50, band: 'watch', reasons: [] },
    };
  });
}

function sendOrganizationsCsv(res, data) {
  const cell = (v) => {
    const s = v == null ? '' : String(v);
    // Quote, and defuse spreadsheet formulas in customer-entered text
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
  const header = ['Organization', 'Owner', 'Owner email', 'Plan', 'Status', 'Health', 'Score', 'Members', 'Active members (7d)', 'Projects', 'MRR (USD)', 'Last active', 'Trial ends', 'Created'];
  const lines = data.map((o) => [
    o.name, o.owner?.name, o.owner?.email, o.plan, o.status, o.health?.computedAt ? o.health.band : '', o.health?.computedAt ? o.health.score : '', o.memberCount, o.activeMembers7d,
    o.projectCount, o.mrr, iso(o.lastActiveAt), iso(o.trialEndsAt), iso(o.createdAt),
  ].map(cell).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="kommently-customers-${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.send([header.map(cell).join(','), ...lines].join('\n'));
}

exports.getOrganizationDetail = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id).populate('owner', 'name email');
  if (!org) return res.status(404).json({ message: 'Organization not found' });

  const now = Date.now();
  const since7 = new Date(now - 7 * DAY_MS);
  const since30 = new Date(now - 30 * DAY_MS);

  const [members, projects, workspaces, invoices, invitations, notes, activity, limits, plans, posthog] = await Promise.all([
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
    getOrgPosthogData(org._id),
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
    // Support the org has (custom overrides applied) and what its plan gives
    support: getSupportForOrg(org),
    planSupport: getSupportForPlan(org.plan, org.trialEndsAt),
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
    health: org.health || { score: 50, band: 'watch', reasons: [] },
    posthog,
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
  if (orgId) {
    if (!mongoose.isValidObjectId(orgId)) return res.status(400).json({ message: 'Invalid organization id' });
    filter.organization = orgId;
  }
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

  // Refuse values that would lock customers out or break checkout and renewals
  for (const key of ['maxProjects', 'maxWorkspaces', 'maxMembers', 'maxGuests', 'maxStorageMB']) {
    const v = b[key];
    if (v === undefined || v === null || v === '') continue;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) {
      return res.status(400).json({ message: `${key} must be a whole number of 0 or more` });
    }
  }
  if (b.price !== undefined && planId !== 'free') {
    if (b.price === null || b.price === '') {
      // Starter and Pro are bought by checkout and renewed automatically, so they need a price
      if (planId === 'starter' || planId === 'pro') {
        return res.status(400).json({ message: 'This plan needs a price' });
      }
    } else if (!(Number(b.price) > 0)) {
      return res.status(400).json({ message: 'Price must be a number greater than 0' });
    }
  }
  if (b.priceInr !== undefined && b.priceInr !== null && b.priceInr !== '' && !(Number(b.priceInr) > 0)) {
    return res.status(400).json({ message: 'INR price must be a number greater than 0' });
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
  if (b.maxWorkspaces !== undefined) {
    const n = numOrSkip(b.maxWorkspaces);
    if (n !== undefined) $set['limits.maxWorkspaces'] = n;
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
  if (b.hasApprovals !== undefined) {
    $set['limits.hasApprovals'] = !!b.hasApprovals;
  }

  // Support channel SLA overrides
  if (b.support && typeof b.support === 'object') {
    if (b.support.tickets !== undefined) $set['support.tickets'] = !!b.support.tickets;
    if (b.support.chat !== undefined) $set['support.chat'] = !!b.support.chat;
    if (b.support.priority !== undefined) {
      $set['support.priority'] = ['normal', 'high', 'urgent'].includes(b.support.priority) ? b.support.priority : 'normal';
    }
    if (b.support.replyHours !== undefined) {
      $set['support.replyHours'] = numOrNull(b.support.replyHours);
    }
  }

  // Extra features
  if (Array.isArray(b.extraFeatures)) {
    $set.extraFeatures = b.extraFeatures
      .map((f) => String(f).slice(0, 200).trim())
      .filter((f) => f.length > 0);
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
  const updateDoc = { $set };
  if (Array.isArray(b.features)) {
    $set.features = b.features
      .map((f) => String(f).slice(0, 200).trim())
      .filter((f) => f.length > 0);
  } else if (b.features === null || b.deriveFeatures === true) {
    updateDoc.$unset = { features: 1 };
  }

  await PlanConfig.findOneAndUpdate(
    { planId },
    updateDoc,
    { upsert: true, returnDocument: 'after' },
  );
  logAdminAction(null, req.admin, 'plan.updated', { planId, changes: $set });

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
  logAdminAction(null, req.admin, 'plan.toggled', { planId, enabled: newEnabled });

  clearPlanCache();
  const plans = await getPlansWithOverrides();
  res.json({ plans });
});

exports.getPlanUsageImpact = asyncHandler(async (req, res) => {
  const { planId } = req.params;
  if (!PLANS[planId]) return res.status(404).json({ message: 'Plan not found' });

  // Trials run on Pro's limits, so lowering Pro affects them too
  const plansAffected = planId === 'pro' ? ['pro', 'trial'] : [planId];
  const orgs = await Organization.find({ plan: { $in: plansAffected }, deletionScheduledAt: null }).select('_id name storageUsedBytes').lean();
  const totalOrgs = orgs.length;
  if (totalOrgs === 0) {
    return res.json({ totalOrgs: 0, impacts: {} });
  }

  const orgIds = orgs.map((o) => o._id);
  const [projectCounts, memberCounts, workspaceCounts] = await Promise.all([
    Project.aggregate([
      { $match: { organization: { $in: orgIds }, status: 'active' } },
      { $group: { _id: '$organization', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { organization: { $in: orgIds } } },
      { $group: { _id: '$organization', count: { $sum: 1 } } },
    ]),
    Workspace.aggregate([
      { $match: { organization: { $in: orgIds } } },
      { $group: { _id: '$organization', count: { $sum: 1 } } },
    ]),
  ]);

  const pMap = new Map(projectCounts.map((p) => [String(p._id), p.count]));
  const mMap = new Map(memberCounts.map((m) => [String(m._id), m.count]));
  const wMap = new Map(workspaceCounts.map((w) => [String(w._id), w.count]));

  const impacts = {};
  const query = Object.keys(req.query || {}).length ? req.query : (req.body || {});

  if (query.maxProjects != null) {
    const limit = Number(query.maxProjects);
    impacts.maxProjects = orgs.filter((o) => (pMap.get(String(o._id)) || 0) > limit).length;
  }
  if (query.maxWorkspaces != null) {
    const limit = Number(query.maxWorkspaces);
    impacts.maxWorkspaces = orgs.filter((o) => (wMap.get(String(o._id)) || 0) > limit).length;
  }
  if (query.maxMembers != null) {
    const limit = Number(query.maxMembers);
    impacts.maxMembers = orgs.filter((o) => (mMap.get(String(o._id)) || 0) > limit).length;
  }
  if (query.maxStorageMB != null) {
    const limitBytes = Number(query.maxStorageMB) * 1048576;
    impacts.maxStorageMB = orgs.filter((o) => (o.storageUsedBytes || 0) > limitBytes).length;
  }

  const affectedCount = Object.values(impacts).reduce((a, b) => Math.max(a, b), 0);
  const hasImpact = affectedCount > 0;

  res.json({ totalOrgs, impacts, hasImpact, affectedCount });
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
  logAdminAction(null, req.admin, 'payment_settings.updated', { changes: $set });

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
  const maxAllowed = req.admin?.role === 'support' ? 14 : 365;
  if (!Number.isFinite(days) || days < 1 || days > maxAllowed) {
    return res.status(400).json({
      message: req.admin?.role === 'support'
        ? 'Support agents can only extend trials by up to 14 days'
        : 'days must be between 1 and 365',
    });
  }
  const org = await Organization.findById(req.params.id);
  if (!org) return res.status(404).json({ message: 'Organization not found' });
  if (org.plan !== 'trial' && org.plan !== 'free') {
    return res.status(400).json({ message: 'Organization must be on a trial or free plan to extend trial' });
  }
  const isSupport = req.admin?.role === 'support';
  // Moving a free org onto a trial changes its plan, which support can't do
  if (isSupport && org.plan === 'free') {
    return res.status(403).json({ message: 'Only a superadmin can start a new trial for a free organization', code: 'INSUFFICIENT_ROLE' });
  }

  const DAY = 24 * 60 * 60 * 1000;
  const now = new Date();
  const from = org.trialEndsAt && org.trialEndsAt > now ? org.trialEndsAt : now;
  const newEndsAt = new Date(from.getTime() + days * DAY);
  // Support's 14 days is a cap on how far out the trial can end, not per request
  if (isSupport && newEndsAt.getTime() > now.getTime() + 14 * DAY) {
    return res.status(400).json({ message: 'Support agents can only extend a trial to at most 14 days from today' });
  }

  const previousPlan = org.plan;
  // trialDays is the trial's total length (the app's progress bar), counted from its start
  let trialStart = now;
  if (org.plan === 'free') {
    org.plan = 'trial';
    org.limits = await getLimitsForPlanAsync('trial');
    if (!org.subscription) org.subscription = {};
    org.subscription.status = 'none';
    org.subscription.currentPeriodEnd = null;
  } else if (org.trialEndsAt) {
    trialStart = new Date(org.trialEndsAt.getTime() - (org.trialDays || DEFAULT_TRIAL_DAYS) * DAY);
  }

  org.trialEndsAt = newEndsAt;
  org.trialDays = Math.max(days, Math.round((newEndsAt.getTime() - trialStart.getTime()) / DAY));
  // Re-arm reminder emails for the new end date and lift a trial-expiry lock
  org.trialReminders = { day7Sent: false, day3Sent: false, day1Sent: false, expiredSent: false };
  clearBillingLock(org);
  await org.save();

  logAdminAction(org._id, req.admin, 'org.trial_extended', {
    days,
    trialEndsAt: org.trialEndsAt,
    previousPlan: previousPlan !== 'trial' ? previousPlan : undefined,
    reason: req.body?.reason ? String(req.body.reason).trim() : undefined,
  });
  res.json({ organization: org });
});

/**
 * GET /api/admin/trial-settings
 * Returns global trial configuration and active trial count.
 */
exports.getTrialSettings = asyncHandler(async (req, res) => {
  const settings = await PaymentSettings.getSingleton();
  const activeTrialOrgsCount = await Organization.countDocuments({
    plan: 'trial',
    isLocked: false,
  });
  res.json({
    defaultDays: settings?.trial?.defaultDays || DEFAULT_TRIAL_DAYS,
    updatedAt: settings?.trial?.updatedAt || null,
    updatedBy: settings?.trial?.updatedBy || null,
    activeTrialOrgsCount,
  });
});

/**
 * PATCH /api/admin/trial-settings  { defaultDays, syncActiveTrials, reason }
 * Configure trial duration globally across all workspaces.
 */
exports.updateTrialSettings = asyncHandler(async (req, res) => {
  const { defaultDays, syncActiveTrials, reason } = req.body;
  const days = parseInt(defaultDays, 10);
  if (!Number.isFinite(days) || days < 1 || days > 365) {
    return res.status(400).json({ message: 'defaultDays must be an integer between 1 and 365' });
  }

  const settings = await PaymentSettings.getSingleton();
  settings.trial = {
    defaultDays: days,
    updatedAt: new Date(),
    updatedBy: req.admin?._id || null,
  };
  await settings.save();
  clearTrialCache();

  let affectedCount = 0;
  if (syncActiveTrials) {
    const activeOrgs = await Organization.find({ plan: 'trial', isLocked: false });
    const now = new Date();
    for (const org of activeOrgs) {
      const base = org.createdAt ? new Date(org.createdAt) : now;
      let newEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

      // If recalculated date is in the past, grant at least `days` from now
      if (newEndsAt <= now) {
        newEndsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      }
      // Only ever extend: never shorten a running trial or undo an admin extension
      if (org.trialEndsAt && newEndsAt <= org.trialEndsAt) continue;
      org.trialDays = Math.max(days, Math.round((newEndsAt.getTime() - base.getTime()) / (24 * 60 * 60 * 1000)));
      org.trialEndsAt = newEndsAt;

      const daysLeft = Math.ceil((newEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      org.trialReminders = {
        day7Sent: daysLeft <= 7,
        day3Sent: daysLeft <= 3,
        day1Sent: daysLeft <= 1,
        expiredSent: false,
      };
      await org.save({ validateBeforeSave: false });
      affectedCount++;
    }
  }

  logAdminAction(null, req.admin, 'admin.trial_settings_updated', {
    defaultDays: days,
    syncActiveTrials: !!syncActiveTrials,
    affectedCount,
    reason: reason ? String(reason).trim() : undefined,
  });

  res.json({
    defaultDays: days,
    updatedAt: settings.trial.updatedAt,
    affectedCount,
    message: syncActiveTrials
      ? `Global trial set to ${days} days and synced across ${affectedCount} active trial workspaces.`
      : `Global trial set to ${days} days for new signups.`,
  });
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
  for (const key of ['hasIntegrations', 'hasActivityLogs', 'hasVersionHistory', 'hasApprovals', 'supportTickets', 'supportChat']) {
    if (typeof b[key] === 'boolean') overrides[key] = b[key];
  }
  if (b.supportPriority) {
    if (!['normal', 'high', 'urgent'].includes(b.supportPriority)) return res.status(400).json({ message: 'Support priority must be normal, high or urgent' });
    overrides.supportPriority = b.supportPriority;
  }
  if (b.supportReplyHours !== null && b.supportReplyHours !== '' && b.supportReplyHours !== undefined) {
    const n = Number(b.supportReplyHours);
    if (!Number.isInteger(n) || n < 1 || n > 720) return res.status(400).json({ message: 'Reply target must be 1 to 720 hours' });
    overrides.supportReplyHours = n;
  }
  org.limitOverrides = overrides;
  await org.save();
  logAdminAction(org._id, req.admin, 'org.limits_overridden', { overrides });
  res.json({ organization: org });
});

exports.setOrganizationDeal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { price, currency, note, until } = req.body;

  const org = await Organization.findById(id);
  if (!org) return res.status(404).json({ message: 'Organization not found' });

  const prevDeal = org.deal ? (org.deal.toObject ? org.deal.toObject() : org.deal) : null;

  if (price === null || price === undefined || price === '') {
    org.deal = { price: null, currency: 'USD', note: null, until: null };
  } else {
    const numPrice = Number(price);
    // A zero price can't be charged by Razorpay or PayPal
    if (!Number.isFinite(numPrice) || numPrice <= 0) {
      return res.status(400).json({ message: 'Price must be a number greater than 0' });
    }
    if (until && Number.isNaN(new Date(until).getTime())) {
      return res.status(400).json({ message: 'Invalid end date' });
    }
    org.deal = {
      price: numPrice,
      currency: currency === 'INR' ? 'INR' : 'USD',
      note: note ? String(note).slice(0, 500) : null,
      until: until ? new Date(until) : null,
    };
  }

  await org.save();
  logAdminAction(org._id, req.admin, 'org.deal_updated', { before: prevDeal, after: org.deal });

  res.json({ organization: org, deal: org.deal });
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
  try {
    const { alertRefundIssued } = require('../utils/adminAlerts');
    const org = await Organization.findById(invoice.organization).select('name');
    alertRefundIssued({ organization: org, invoice, amount: invoice.amount, currency: invoice.currency, admin: req.admin }).catch(() => {});
  } catch {}
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
  logAdminAction(req.params.id, req.admin, 'org.note_added');
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
  logAdminAction(req.params.id, req.admin, 'org.note_deleted');
  res.json({ message: 'Note deleted' });
});

// ── Admin action log ─────────────────────────────────────────────

exports.getAuditLog = asyncHandler(async (req, res) => {
  const { page, limit } = parsePaging(req.query);
  const filter = { 'metadata.actorRole': 'superadmin' };
  if (req.query.orgId) {
    if (!mongoose.isValidObjectId(req.query.orgId)) return res.status(400).json({ message: 'Invalid organization id' });
    filter.organization = req.query.orgId;
  }
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

// ── Revenue & Invoices (Phase 6) ─────────────────────────────────

exports.getRevenue = asyncHandler(async (req, res) => {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const fourteenDaysAhead = new Date(now.getTime() + 14 * dayMs);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * dayMs);

  const plans = await getPlansWithOverrides();

  // 1. Paying organizations & current MRR breakdown (custom deals count only for paying orgs)
  const payingOrgs = await Organization.find({
    deletionScheduledAt: null,
    plan: { $in: ['starter', 'pro', 'enterprise'] },
    'subscription.status': 'active',
  }).select('name plan subscription deal').lean();

  const mrrByPlan = {
    starter: { usd: 0, inr: 0, count: 0 },
    pro: { usd: 0, inr: 0, count: 0 },
    enterprise: { usd: 0, inr: 0, count: 0 },
    custom: { usd: 0, inr: 0, count: 0 },
  };

  let totalUsdMrr = 0;
  let totalInrMrr = 0;

  for (const org of payingOrgs) {
    if (activeDeal(org, now)) {
      if (org.deal.currency === 'INR') {
        totalInrMrr += Number(org.deal.price);
        mrrByPlan.custom.inr += Number(org.deal.price);
      } else {
        totalUsdMrr += Number(org.deal.price);
        mrrByPlan.custom.usd += Number(org.deal.price);
      }
      mrrByPlan.custom.count++;
    } else if (org.subscription?.status === 'active' && ['starter', 'pro'].includes(org.plan)) {
      const planConfig = plans[org.plan];
      const usdPrice = Number(planConfig?.price) || 0;
      const inrPrice = Number(planConfig?.priceInr) || Math.round(usdPrice * USD_INR_RATE);

      if (org.subscription?.provider === 'razorpay') {
        totalInrMrr += inrPrice;
        mrrByPlan[org.plan].inr += inrPrice;
      } else {
        totalUsdMrr += usdPrice;
        mrrByPlan[org.plan].usd += usdPrice;
      }
      mrrByPlan[org.plan].count++;
    }
  }

  // 2. New MRR this month (paid checkouts, i.e. conversions and upgrades; renewals have a
  // billingMonth) & Churned MRR this month (subscriptions that ended, priced at their last payment)
  const [newPayments, churnedOrgsMonth, ninetyDaysTrials, ninetyDaysConverted] = await Promise.all([
    Invoice.find({
      status: 'paid',
      paidAt: { $gte: startOfMonth },
      billingMonth: null,
    }).select('organization amount currency').lean(),
    Organization.find({
      'subscription.status': 'canceled',
      updatedAt: { $gte: startOfMonth },
    }).select('_id').lean(),
    Organization.countDocuments({
      createdAt: { $gte: ninetyDaysAgo, $lte: new Date(now.getTime() - 14 * dayMs) },
    }),
    Organization.countDocuments({
      createdAt: { $gte: ninetyDaysAgo, $lte: new Date(now.getTime() - 14 * dayMs) },
      plan: { $in: ['starter', 'pro', 'enterprise'] },
    }),
  ]);

  // Invoice amounts are in the smallest unit (cents / paise); totals stay per currency
  const sumByCurrency = (invoices) => invoices.reduce((acc, inv) => {
    if (inv.currency === 'USD') acc.usd += (inv.amount || 0) / 100;
    else acc.inr += (inv.amount || 0) / 100;
    return acc;
  }, { usd: 0, inr: 0 });

  const newMrr30d = {
    ...sumByCurrency(newPayments),
    count: new Set(newPayments.map((inv) => String(inv.organization))).size,
  };

  const lastPayments = churnedOrgsMonth.length
    ? await Invoice.aggregate([
      { $match: { organization: { $in: churnedOrgsMonth.map((o) => o._id) }, status: 'paid' } },
      { $sort: { paidAt: -1 } },
      { $group: { _id: '$organization', amount: { $first: '$amount' }, currency: { $first: '$currency' } } },
    ])
    : [];
  const churnedMrr30d = {
    ...sumByCurrency(lastPayments),
    count: churnedOrgsMonth.length,
  };

  const trialConversionRate = ninetyDaysTrials > 0
    ? Math.round((ninetyDaysConverted / ninetyDaysTrials) * 100)
    : 0;

  // 3. Upcoming Renewals (next 14 days)
  const upcomingRenewals = await Organization.find({
    plan: { $in: ['starter', 'pro', 'enterprise'] },
    'subscription.status': 'active',
    'subscription.cancelAtPeriodEnd': { $ne: true },
    'subscription.currentPeriodEnd': { $gte: now, $lte: fourteenDaysAhead },
  })
    .sort({ 'subscription.currentPeriodEnd': 1 })
    .select('name plan subscription deal owner')
    .populate('owner', 'name email')
    .lean();

  // 4. Unpaid & Failed renewal invoices (abandoned checkouts also stay pending; leave them out)
  const unpaidInvoices = await Invoice.find({
    status: { $in: ['pending', 'failed'] },
    billingMonth: { $type: 'string' },
  })
    .sort({ dueAt: 1, createdAt: -1 })
    .limit(20)
    .populate('organization', 'name plan')
    .lean();

  // 5. Recent Payments (last 20)
  const recentPayments = await Invoice.find({
    status: 'paid',
  })
    .sort({ paidAt: -1, createdAt: -1 })
    .limit(20)
    .populate('organization', 'name plan')
    .lean();

  // 6. Recent Refunds (last 20)
  const recentRefunds = await Invoice.find({
    status: 'refunded',
  })
    .sort({ refundedAt: -1, updatedAt: -1 })
    .limit(20)
    .populate('organization', 'name plan')
    .lean();

  // 7. Scheduled Cancellations (cancel at period end)
  const scheduledCancellations = await Organization.find({
    'subscription.cancelAtPeriodEnd': true,
    deletionScheduledAt: null,
  })
    .sort({ 'subscription.currentPeriodEnd': 1 })
    .select('name plan subscription owner')
    .populate('owner', 'name email')
    .lean();

  res.json({
    kpis: {
      totalUsdMrr,
      totalInrMrr,
      payingOrgsCount: payingOrgs.length,
      newMrr30d,
      churnedMrr30d,
      trialConversionRate,
    },
    mrrByPlan,
    upcomingRenewals,
    unpaidInvoices,
    recentPayments,
    recentRefunds,
    scheduledCancellations,
  });
});

exports.getInvoices = asyncHandler(async (req, res) => {
  const { status, plan, currency, from, to, format } = req.query;
  const csv = format === 'csv';
  const { page, limit } = parsePaging(req.query);

  const filter = {};
  if (status) filter.status = String(status);
  if (plan) filter.plan = String(plan);
  if (currency) filter.currency = String(currency).toUpperCase();
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  if (csv) {
    const invoices = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .populate('organization', 'name billingDetails')
      .lean();

    const cell = (v) => {
      const s = v == null ? '' : String(v);
      return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
    };
    const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
    const header = ['Invoice Number', 'Date', 'Organization', 'Buyer Legal Name', 'GSTIN', 'Plan', 'Currency', 'Amount', 'Taxable', 'Tax', 'Status', 'Paid At', 'Provider', 'Due Date'];
    const lines = invoices.map((inv) => {
      const amt = (inv.amount / 100).toFixed(2);
      const taxAmt = inv.tax?.total ? (inv.tax.total / 100).toFixed(2) : '0.00';
      const taxableAmt = inv.tax?.taxable ? (inv.tax.taxable / 100).toFixed(2) : amt;
      return [
        inv.invoiceNumber || '',
        iso(inv.createdAt),
        inv.organization?.name || '',
        inv.buyer?.name || inv.organization?.billingDetails?.legalName || '',
        inv.buyer?.taxId || inv.organization?.billingDetails?.taxId || '',
        inv.plan,
        inv.currency,
        amt,
        taxableAmt,
        taxAmt,
        inv.status,
        iso(inv.paidAt),
        inv.provider || '',
        iso(inv.dueAt),
      ].map(cell).join(',');
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kommently-invoices-${new Date().toISOString().slice(0, 10)}.csv"`);
    const csvContent = [header.map(cell).join(','), ...lines].join('\n');
    if (typeof res.send === 'function') {
      return res.send(csvContent);
    }
    return res.end(csvContent);
  }

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('organization', 'name billingDetails')
      .lean(),
    Invoice.countDocuments(filter),
  ]);

  res.json({
    invoices,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});
