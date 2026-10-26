const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');
const Project = require('../models/Project');
const asyncHandler = require('../utils/asyncHandler');
const { logOrgActivity } = require('../utils/activityLogger');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { URLS } = require('../config/env');
const { ensureDefaultWorkspace, visibleProjectsQuery } = require('../utils/workspaces');
const { isLevel, capForRole, workspaceLevel, atLeast } = require('../utils/access');
const { canAssignRole } = require('../middleware/roles');
const Invitation = require('../models/Invitation');
const { seatLimitError } = require('../middleware/orgLimits');
const { sendInvitationEmail } = require('../utils/mailer');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function cleanName(raw) {
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (!name) return { error: 'Workspace name is required' };
  if (name.length > 60) return { error: 'Workspace name must be 60 characters or less' };
  return { name };
}

async function nameTaken(orgId, name, exceptId) {
  const query = { organization: orgId, name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') } };
  if (exceptId) query._id = { $ne: exceptId };
  return !!(await Workspace.exists(query));
}

/**
 * GET /api/workspaces
 * The org's workspaces with the number of projects the user can see in each.
 */
exports.getWorkspaces = asyncHandler(async (req, res) => {
  const orgId = req.user.organization;
  const defaultWs = await ensureDefaultWorkspace(orgId);
  const workspaces = await Workspace.find({ organization: orgId }).sort({ isDefault: -1, name: 1 }).lean();

  const isOrgAdmin = req.user.role === 'owner' || req.user.role === 'admin';
  const match = isOrgAdmin ? { organization: orgId } : await visibleProjectsQuery(req.user);
  const counts = await Project.aggregate([
    { $match: { ...match, status: { $ne: 'archived' } } },
    { $group: { _id: { $ifNull: ['$workspace', defaultWs._id] }, count: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((c) => [c._id.toString(), c.count]));

  const uid = req.user._id.toString();
  const list = workspaces
    .map((w) => {
      const myLevel = workspaceLevel(req.user, w);
      const canManage = myLevel === 'manage';
      return {
        ...w,
        myLevel,
        projectCount: byId.get(w._id.toString()) || 0,
        memberCount: (w.members || []).length,
        isMember: (w.members || []).some((m) => m.user.toString() === uid),
        shareSettings: canManage && w.shareSettings
          ? { enabled: !!w.shareSettings.enabled, token: w.shareSettings.token, allowComments: w.shareSettings.allowComments !== false, expiresAt: w.shareSettings.expiresAt, hasPassword: !!w.shareSettings.passwordHash }
          : undefined,
        members: canManage ? (w.members || []) : undefined,
      };
    })
    // Members only see workspaces they belong to or have projects in
    .filter((w) => isOrgAdmin || w.isDefault || w.isMember || w.projectCount > 0);

  res.json({ workspaces: list });
});

/**
 * POST /api/workspaces  { name }
 */
exports.createWorkspace = asyncHandler(async (req, res) => {
  const orgId = req.user.organization;
  const { name, error } = cleanName(req.body?.name);
  if (error) return res.status(400).json({ message: error });

  await ensureDefaultWorkspace(orgId);
  if (await nameTaken(orgId, name)) {
    return res.status(400).json({ message: 'A workspace with this name already exists' });
  }

  const workspace = await Workspace.create({ organization: orgId, name, createdBy: req.user._id });
  logOrgActivity(orgId, req.user._id, 'workspace.created', { name });
  res.status(201).json({ workspace: { ...workspace.toObject(), projectCount: 0 } });
});

/**
 * PATCH /api/workspaces/:workspaceId  { name }
 */
exports.updateWorkspace = asyncHandler(async (req, res) => {
  const orgId = req.user.organization;
  const workspace = mongoose.isValidObjectId(req.params.workspaceId)
    ? await Workspace.findOne({ _id: req.params.workspaceId, organization: orgId })
    : null;
  if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

  const { name, error } = cleanName(req.body?.name);
  if (error) return res.status(400).json({ message: error });
  if (await nameTaken(orgId, name, workspace._id)) {
    return res.status(400).json({ message: 'A workspace with this name already exists' });
  }

  const oldName = workspace.name;
  workspace.name = name;
  await workspace.save();
  logOrgActivity(orgId, req.user._id, 'workspace.renamed', { from: oldName, name });
  res.json({ workspace });
});

/**
 * DELETE /api/workspaces/:workspaceId
 * Projects are kept: they move to the default workspace.
 */
exports.deleteWorkspace = asyncHandler(async (req, res) => {
  const orgId = req.user.organization;
  const workspace = mongoose.isValidObjectId(req.params.workspaceId)
    ? await Workspace.findOne({ _id: req.params.workspaceId, organization: orgId })
    : null;
  if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
  if (workspace.isDefault) {
    return res.status(400).json({ message: 'The default workspace cannot be deleted' });
  }

  const defaultWs = await ensureDefaultWorkspace(orgId);
  const moved = await Project.updateMany({ organization: orgId, workspace: workspace._id }, { workspace: defaultWs._id });
  await workspace.deleteOne();
  logOrgActivity(orgId, req.user._id, 'workspace.deleted', { name: workspace.name, movedProjects: moved.modifiedCount });
  res.json({ message: 'Workspace deleted', movedTo: defaultWs._id, movedProjects: moved.modifiedCount });
});

// Set by workspaceAccess(level) on the route; looked up here otherwise
async function loadOrgWorkspace(req, res) {
  if (req.workspace) return req.workspace;
  const workspace = mongoose.isValidObjectId(req.params.workspaceId)
    ? await Workspace.findOne({ _id: req.params.workspaceId, organization: req.user.organization })
    : null;
  if (!workspace) res.status(404).json({ message: 'Workspace not found' });
  return workspace;
}

/**
 * GET /api/workspaces/:workspaceId/members
 */
exports.getWorkspaceMembers = asyncHandler(async (req, res) => {
  const workspace = await loadOrgWorkspace(req, res);
  if (!workspace) return;
  const levels = new Map(workspace.members.map((m) => [m.user.toString(), m.level]));
  const users = await User.find({ _id: { $in: [...levels.keys()] }, organization: req.user.organization })
    .select('name email role avatar').sort({ name: 1 });
  res.json({ members: users.map((u) => ({ ...u.toObject(), level: capForRole(levels.get(u._id.toString()), u.role) })) });
});

/**
 * PUT /api/workspaces/:workspaceId/members  { members: [{ userId, level }] }
 * Sets who has access to the workspace and at which level (view | comment |
 * manage; guests get comment at most). People in this organization only.
 */
exports.setWorkspaceMembers = asyncHandler(async (req, res) => {
  const workspace = await loadOrgWorkspace(req, res);
  if (!workspace) return;
  const raw = Array.isArray(req.body?.members)
    ? req.body.members
    : Array.isArray(req.body?.userIds) ? req.body.userIds.map((userId) => ({ userId, level: 'comment' })) : null;
  if (!raw || raw.some((m) => !mongoose.isValidObjectId(m?.userId) || (m.level !== undefined && !isLevel(m.level)))) {
    return res.status(400).json({ message: 'members must be a list of { userId, level }' });
  }
  const wanted = new Map(raw.map((m) => [String(m.userId), m.level || 'comment']));
  const users = await User.find({ _id: { $in: [...wanted.keys()] }, organization: req.user.organization }).select('name email role avatar');
  if (users.length !== wanted.size) {
    return res.status(400).json({ message: 'Everyone added must be part of this organization' });
  }
  workspace.members = users.map((u) => ({ user: u._id, level: capForRole(wanted.get(u._id.toString()), u.role) }));
  await workspace.save();
  logOrgActivity(req.user.organization, req.user._id, 'workspace.members_updated', { name: workspace.name, count: users.length });
  const levels = new Map(workspace.members.map((m) => [m.user.toString(), m.level]));
  res.json({ members: users.map((u) => ({ ...u.toObject(), level: levels.get(u._id.toString()) })) });
});

const shareResponse = (workspace) => ({
  shareSettings: {
    enabled: workspace.shareSettings.enabled,
    token: workspace.shareSettings.token,
    allowComments: workspace.shareSettings.allowComments,
    expiresAt: workspace.shareSettings.expiresAt,
    hasPassword: !!workspace.shareSettings.passwordHash,
  },
  shareUrl: `${URLS.app}/review/w/${workspace.shareSettings.token}`,
});

async function applyShareInput(workspace, { password, allowComments, expiresAt }) {
  if (password !== undefined) workspace.shareSettings.passwordHash = password ? await bcrypt.hash(String(password), 10) : null;
  if (allowComments !== undefined) workspace.shareSettings.allowComments = !!allowComments;
  if (expiresAt !== undefined) workspace.shareSettings.expiresAt = expiresAt || null;
}

/**
 * POST /api/workspaces/:workspaceId/share  { password?, allowComments?, expiresAt? }
 * One review link for every project in the workspace.
 */
exports.enableWorkspaceShare = asyncHandler(async (req, res) => {
  const workspace = await loadOrgWorkspace(req, res);
  if (!workspace) return;
  if (!workspace.shareSettings?.token) {
    workspace.shareSettings = { enabled: true, token: crypto.randomBytes(16).toString('hex'), allowComments: true };
  }
  workspace.shareSettings.enabled = true;
  await applyShareInput(workspace, req.body || {});
  await workspace.save();
  logOrgActivity(req.user.organization, req.user._id, 'workspace.share_enabled', { name: workspace.name });
  res.json(shareResponse(workspace));
});

/**
 * PATCH /api/workspaces/:workspaceId/share
 */
exports.updateWorkspaceShare = asyncHandler(async (req, res) => {
  const workspace = await loadOrgWorkspace(req, res);
  if (!workspace) return;
  if (!workspace.shareSettings?.token) {
    return res.status(400).json({ message: 'Sharing is not enabled for this workspace.' });
  }
  await applyShareInput(workspace, req.body || {});
  await workspace.save();
  res.json(shareResponse(workspace));
});

/**
 * DELETE /api/workspaces/:workspaceId/share
 */
exports.disableWorkspaceShare = asyncHandler(async (req, res) => {
  const workspace = await loadOrgWorkspace(req, res);
  if (!workspace) return;
  if (workspace.shareSettings) workspace.shareSettings.enabled = false;
  await workspace.save();
  logOrgActivity(req.user.organization, req.user._id, 'workspace.share_disabled', { name: workspace.name });
  res.json({ message: 'Sharing disabled' });
});

/**
 * GET /api/workspaces/people
 * Everyone in the organization, to pick workspace members from (org admins
 * and people who manage a workspace).
 */
exports.getOrgPeople = asyncHandler(async (req, res) => {
  const isOrgAdmin = req.user.role === 'owner' || req.user.role === 'admin';
  if (!isOrgAdmin) {
    const manages = await Workspace.exists({ organization: req.user.organization, members: { $elemMatch: { user: req.user._id, level: 'manage' } } });
    if (!manages || req.user.role === 'guest') return res.status(403).json({ message: 'Not allowed' });
  }
  const people = await User.find({ organization: req.user.organization })
    .select('name email role avatar').sort({ name: 1, email: 1 });
  res.json({ people });
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/workspaces/:workspaceId/invitations  { emails: [], role: member|guest }
 * People already in the organization join the workspace right away; new people
 * get an email invitation and join the organization and the workspace on signup.
 */
exports.inviteToWorkspace = asyncHandler(async (req, res) => {
  const workspace = await loadOrgWorkspace(req, res);
  if (!workspace) return;
  const orgId = req.user.organization.toString();
  const role = req.body?.role === 'guest' ? 'guest' : 'member';
  const requestedLevel = isLevel(req.body?.level) ? req.body.level : 'comment';
  const raw = Array.isArray(req.body?.emails) ? req.body.emails : [req.body?.email];
  const emails = [...new Set(raw.filter(Boolean).map((e) => String(e).toLowerCase().trim()))];
  if (!emails.length) return res.status(400).json({ message: 'Add at least one email address' });
  if (emails.length > 20) return res.status(400).json({ message: 'Invite up to 20 people at a time' });
  const bad = emails.find((e) => !EMAIL_RE.test(e));
  if (bad) return res.status(400).json({ message: `"${bad}" is not a valid email address` });

  const results = [];
  for (const email of emails) {
    const user = await User.findOne({ email });
    if (user) {
      if (user.organization && user.organization.toString() !== orgId) {
        results.push({ email, status: 'error', message: 'Already belongs to another organization' });
        continue;
      }
      if (!user.organization) {
        const seatError = await seatLimitError(req.organization, role);
        if (seatError) { results.push({ email, status: 'error', ...seatError }); continue; }
        user.organization = req.user.organization;
        if (!['owner', 'superadmin'].includes(user.role)) user.role = role;
        await user.save({ validateBeforeSave: false });
      }
      if (workspace.members.some((m) => m.user.toString() === user._id.toString())) {
        results.push({ email, status: 'already', message: 'Already a member' });
        continue;
      }
      workspace.members.push({ user: user._id, level: capForRole(requestedLevel, user.role) });
      results.push({ email, status: 'added', name: user.name });
      continue;
    }

    const pending = await Invitation.findOne({ email, workspace: workspace._id, status: 'pending' });
    if (pending && pending.expiresAt > new Date()) {
      results.push({ email, status: 'already', message: 'Invitation already sent' });
      continue;
    }
    if (pending) await pending.deleteOne();
    const seatError = await seatLimitError(req.organization, role);
    if (seatError) { results.push({ email, status: 'error', ...seatError }); continue; }

    const token = crypto.randomBytes(32).toString('hex');
    await Invitation.create({
      email, workspace: workspace._id, organization: req.user.organization, invitedBy: req.user._id, role, level: capForRole(requestedLevel, role), token,
    });
    let emailSent = true;
    try {
      await sendInvitationEmail(email, req.user.name, `the ${workspace.name} workspace`, `${URLS.app}/signup?token=${token}`);
    } catch (err) {
      emailSent = false;
      req.log?.warn({ err: err.message }, 'workspace invitation email failed');
    }
    results.push({ email, status: 'invited', emailSent });
  }

  await workspace.save();
  const added = results.filter((r) => r.status === 'added' || r.status === 'invited').length;
  if (added) logOrgActivity(req.user.organization, req.user._id, 'workspace.members_updated', { name: workspace.name, invited: added });
  res.status(201).json({ results });
});

/**
 * GET /api/workspaces/:workspaceId/invitations — pending invitations
 */
exports.getWorkspaceInvitations = asyncHandler(async (req, res) => {
  const workspace = await loadOrgWorkspace(req, res);
  if (!workspace) return;
  await Invitation.deleteMany({ workspace: workspace._id, status: 'pending', expiresAt: { $lte: new Date() } });
  const invitations = await Invitation.find({ workspace: workspace._id, status: 'pending' })
    .select('-token').populate('invitedBy', 'name email').sort({ createdAt: -1 });
  res.json({ invitations });
});

/**
 * PATCH /api/workspaces/people/:userId/role  { role: admin|member|guest }
 * Organization role (Team page). Access to workspaces and projects is set on
 * each of them separately.
 */
exports.updateOrgRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body || {};
  if (!['admin', 'member', 'guest'].includes(role)) {
    return res.status(400).json({ message: 'Role must be admin, member, or guest' });
  }
  if (!canAssignRole(req.user.role, role)) {
    return res.status(403).json({ message: 'Cannot assign a role higher than your own' });
  }
  if (req.user._id.toString() === userId) return res.status(400).json({ message: 'Cannot change your own role' });
  const target = mongoose.isValidObjectId(userId) ? await User.findOne({ _id: userId, organization: req.user.organization }) : null;
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (target.role === 'owner' || target.role === 'superadmin') {
    return res.status(403).json({ message: "Cannot change the owner's role" });
  }
  if ((target.role === 'guest') !== (role === 'guest')) {
    const seatError = await seatLimitError(req.organization, role);
    if (seatError) return res.status(403).json(seatError);
  }
  target.role = role;
  await target.save({ validateBeforeSave: false });
  res.json({ user: { _id: target._id, name: target.name, email: target.email, role: target.role } });
});
