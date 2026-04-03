const User = require('../models/User');
const Organization = require('../models/Organization');
const Project = require('../models/Project');
const Pin = require('../models/Pin');
const Activity = require('../models/Activity');
const PlanConfig = require('../models/PlanConfig');
const asyncHandler = require('../utils/asyncHandler');
const { PLANS, getPlansWithOverrides, clearPlanCache } = require('../config/plans');

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
  const { page = 1, limit = 20, plan, status, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

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
      .limit(parseInt(limit))
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
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
  });
});

exports.getOrganizationDetail = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id).populate('owner', 'name email');
  if (!org) return res.status(404).json({ message: 'Organization not found' });

  const [members, projects, pinStats] = await Promise.all([
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
  ]);

  res.json({
    organization: org,
    members,
    projects,
    pinStats: pinStats[0] || { total: 0, resolved: 0 },
  });
});

exports.lockOrganization = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const org = await Organization.findByIdAndUpdate(
    req.params.id,
    { isLocked: true, lockedAt: new Date(), lockedReason: reason || 'Locked by admin' },
    { new: true },
  );
  if (!org) return res.status(404).json({ message: 'Organization not found' });
  res.json({ organization: org });
});

exports.unlockOrganization = asyncHandler(async (req, res) => {
  const org = await Organization.findByIdAndUpdate(
    req.params.id,
    { isLocked: false, lockedAt: null, lockedReason: null },
    { new: true },
  );
  if (!org) return res.status(404).json({ message: 'Organization not found' });
  res.json({ organization: org });
});

// ── Users ────────────────────────────────────────────────────────

exports.getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search, orgId } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

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
      .limit(parseInt(limit))
      .select('name email role organization lastSeen lastLoginIp lastLoginLocation signupIp signupLocation avatar createdAt')
      .populate('organization', 'name plan'),
    User.countDocuments(filter),
  ]);

  res.json({
    users,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
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
  const { page = 1, limit = 20, orgId, status, projectStatus, type } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = {};
  if (orgId) filter.organization = orgId;
  if (status) filter.status = status;
  if (projectStatus) filter.projectStatus = projectStatus;
  if (type) filter.projectType = type;

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
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
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
  });
});

// ── Plans Management ─────────────────────────────────────────────

exports.getPlans = asyncHandler(async (req, res) => {
  const plans = await getPlansWithOverrides();
  res.json({ plans });
});

exports.updatePlan = asyncHandler(async (req, res) => {
  const { planId } = req.params;
  const { maxProjects, maxMembers, maxGuests } = req.body;

  if (!PLANS[planId]) {
    return res.status(404).json({ message: 'Plan not found' });
  }

  const limits = {};
  if (maxProjects !== undefined) limits['limits.maxProjects'] = maxProjects;
  if (maxMembers !== undefined) limits['limits.maxMembers'] = maxMembers;
  if (maxGuests !== undefined) limits['limits.maxGuests'] = maxGuests;

  await PlanConfig.findOneAndUpdate(
    { planId },
    { $set: limits },
    { upsert: true, new: true },
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
