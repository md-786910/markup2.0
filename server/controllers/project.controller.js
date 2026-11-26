const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const Project = require('../models/Project');
const User = require('../models/User');
const Pin = require('../models/Pin');
const Comment = require('../models/Comment');
const Invitation = require('../models/Invitation');
const Activity = require('../models/Activity');
const asyncHandler = require('../utils/asyncHandler');
const { sendInvitationEmail } = require('../utils/mailer');
const { canAssignRole } = require('../middleware/roles');
const { isLevel, capForRole } = require('../utils/access');
const { logActivity } = require('../utils/activityLogger');
const { metric } = require('../instrument');
const { createProjectNotifications, createSingleNotification } = require('../utils/notificationHelper');
const { signProxyToken } = require('../utils/proxyToken');
const { seatLimitError } = require('../middleware/orgLimits');
const { deleteProjectCascade } = require('../utils/cascade');
const { refundUploads, deleteStoredFiles } = require('../utils/storage');
const { mshotsUrl, isMshotsUrl, isStoredThumbnail, storeWebsiteThumbnail } = require('../utils/websiteThumbnail');
const { storeDocumentThumbnail, canThumbnail } = require('../utils/documentThumbnail');
const { URLS } = require('../config/env');
const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');
const { ensureDefaultWorkspace, visibleProjectsQuery } = require('../utils/workspaces');
const { isValidWebsiteUrl, MIN_SHARE_PASSWORD_LENGTH } = require('../utils/inputValidation');

const INVALID_WEBSITE_URL = 'Enter a valid website address starting with http:// or https://';

// A non-empty review-link password must have a minimum length ('' / null clears it)
function sharePasswordError(password) {
  if (password === undefined || password === null || password === '') return null;
  if (typeof password !== 'string' || password.length < MIN_SHARE_PASSWORD_LENGTH || password.length > 200) {
    return `The link password must be ${MIN_SHARE_PASSWORD_LENGTH} to 200 characters.`;
  }
  return null;
}

// A workspace id from the request that belongs to the org, else the default one
async function resolveWorkspace(orgId, requestedId) {
  if (requestedId && mongoose.isValidObjectId(requestedId)) {
    const ws = await Workspace.findOne({ _id: requestedId, organization: orgId });
    if (ws) return ws;
  }
  return ensureDefaultWorkspace(orgId);
}

// Hash a share-link password with bcrypt. 10 rounds (vs 12 for user passwords)
// because share passwords are typically shorter / lower-stakes and we want
// cheap verification on every guest review-page load.
async function hashSharePassword(plaintext) {
  if (!plaintext) return null;
  return bcrypt.hash(String(plaintext), 10);
}

// Strip password / passwordHash before sending shareSettings back to the client.
// Both fields are scrubbed: clients never need them, and the hash shouldn't
// leak even though it's bcrypt.
function sanitizeShareSettings(shareSettings) {
  if (!shareSettings) return shareSettings;
  const obj = shareSettings.toObject ? shareSettings.toObject() : { ...shareSettings };
  delete obj.password;
  delete obj.passwordHash;
  obj.hasPassword = !!(shareSettings.passwordHash || shareSettings.password);
  return obj;
}

// Share settings for someone with `level` on the project: the link token opens
// the guest review (and guest posting), so only people who manage the project
// get it
// A review link's end date: empty (no end) or a valid date in the future
function shareExpiryError(expiresAt) {
  if (expiresAt === undefined || expiresAt === null || expiresAt === '') return null;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return 'The end date is not a valid date.';
  if (d <= new Date()) return 'Choose an end date in the future.';
  return null;
}

function shareSettingsFor(shareSettings, level) {
  const obj = sanitizeShareSettings(shareSettings);
  if (obj && level !== 'manage') delete obj.token;
  return obj;
}

exports.createProject = asyncHandler(async (req, res) => {
  const { name, websiteUrl, projectType = 'website' } = req.body;

  // Uploads were reserved by enforceStorageQuota: refusals give them back
  if (!name) {
    await refundUploads(req);
    return res.status(400).json({ message: 'Project name is required' });
  }

  if (projectType === 'website' && !websiteUrl) {
    await refundUploads(req);
    return res.status(400).json({ message: 'Website URL is required for website projects' });
  }

  if (projectType === 'website' && !isValidWebsiteUrl(websiteUrl)) {
    await refundUploads(req);
    return res.status(400).json({ message: INVALID_WEBSITE_URL });
  }

  if (projectType === 'document' && (!req.files || req.files.length === 0)) {
    await refundUploads(req);
    return res.status(400).json({ message: 'At least one document file is required' });
  }

  const orgId = req.user.organization;
  const existing = await Project.findOne({
    organization: orgId,
    name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  });
  if (existing) {
    await refundUploads(req);
    return res.status(400).json({ message: 'A project with this name already exists' });
  }

  const workspace = await resolveWorkspace(orgId, req.body.workspace);
  let firstFileSource = null;
  const projectData = {
    name,
    projectType,
    owner: req.user._id,
    organization: orgId,
    workspace: workspace._id,
    members: [req.user._id],
  };

  if (projectType === 'website') {
    projectData.websiteUrl = websiteUrl;
    // Shown at once; storeWebsiteThumbnail (below) replaces it with a stored copy
    projectData.thumbnail = mshotsUrl(websiteUrl);
  } else {
    // Build documents array from uploaded files
    const documents = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      let pageCount = 1;
      let thumbnail = null;

      if (file.mimetype.startsWith('image/')) {
        thumbnail = `uploads/documents/${file.filename}`;
      }

      // The first file's bytes make the card thumbnail after the response
      // (with Cloudinary, req.file.path is a temp copy gone once it is sent)
      if (i === 0 && canThumbnail(file)) {
        try {
          firstFileSource = { buffer: await fs.promises.readFile(file.path), mimetype: file.mimetype };
        } catch { /* the thumbnail is optional */ }
      }

      if (file.mimetype === 'application/pdf') {
        // pdf-parse v2: a PDFParse instance per document (v1's pdfParse(buffer)
        // function no longer exists, which made every PDF count as 1 page)
        let parser = null;
        try {
          const { PDFParse } = require('pdf-parse');
          // Async read: a large PDF no longer blocks the event loop
          // (a copy: pdf.js may detach the buffer, and the thumbnail reuses it)
          const data = i === 0 && firstFileSource ? new Uint8Array(firstFileSource.buffer) : await fs.promises.readFile(file.path);
          parser = new PDFParse({ data });
          const info = await parser.getInfo();
          pageCount = info.total || 1;
        } catch (err) {
          console.error('Failed to parse PDF page count:', err.message);
        } finally {
          if (parser) await parser.destroy().catch(() => {});
        }
      }

      documents.push({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: `uploads/documents/${file.filename}`,
        thumbnail,
        pageCount,
        order: i,
      });
    }
    projectData.documents = documents;
    if (documents[0]?.thumbnail) {
      projectData.thumbnail = documents[0].thumbnail;
    }
  }

  const project = await Project.create(projectData);

  // Activity log
  logActivity(project._id, req.user._id, 'project.created', { projectName: name });

  metric('project.created', { type: projectType });
  // Saves the website screenshot with the file storage provider (background)
  if (project.projectType === 'website') storeWebsiteThumbnail(project._id);
  // Small WebP of the first page/image for the dashboard card (background)
  else if (firstFileSource) storeDocumentThumbnail(project._id, firstFileSource);
  res.status(201).json({
    project: { ...project.toObject(), proxyToken: project.projectType === 'website' ? signProxyToken(req.user, project._id) : undefined },
  });
});

exports.getProjects = asyncHandler(async (req, res) => {
  const orgId = req.user.organization;
  const isPlatformAdmin = req.user.role === 'admin' || req.user.role === 'owner';

  // Admins/owners see all org projects; members/guests see only their projects
  const query = isPlatformAdmin
    ? { organization: orgId }
    : await visibleProjectsQuery(req.user);

  // Projects created before workspaces have none: they belong to the default one
  const defaultWs = await ensureDefaultWorkspace(orgId);
  if (req.query.workspace && mongoose.isValidObjectId(req.query.workspace)) {
    query.workspace = req.query.workspace === defaultWs._id.toString()
      ? { $in: [defaultWs._id, null] }
      : req.query.workspace;
  }

  // Plain objects (lean): the list is read-only. Only the first document is
  // sent (cards show it; the project page loads the full project), and no
  // per-project proxy token: only the project page frames the site and gets
  // its own from GET /projects/:id.
  const projects = await Project.find(query)
    .select({ documents: { $slice: 1 }, __v: 0 })
    .populate('owner', 'name email lastSeen')
    .populate('members', 'name email role lastSeen avatar')
    .lean();

  // Per-project open/resolved pin and comment counts for the dashboard cards,
  // computed in MongoDB: one grouped pass over the pins (only project, status
  // and _id), then one over the comments of those pins (index { pin: 1, … }),
  // instead of a $lookup per pin. The access levels load at the same time.
  const projectIds = projects.map((p) => p._id);
  const { projectLevelsFor } = require('../utils/workspaces');
  const [pinStats, levels] = await Promise.all([
    projectIds.length ? Pin.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $project: { project: 1, status: 1 } },
      {
        $group: {
          _id: '$project',
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          total: { $sum: 1 },
          pinIds: { $push: '$_id' },
        },
      },
    ]) : [],
    projectLevelsFor(req.user, projects),
  ]);
  const projectOfPin = new Map();
  for (const st of pinStats) for (const pinId of st.pinIds) projectOfPin.set(pinId.toString(), st._id.toString());
  const commentCounts = projectOfPin.size ? await Comment.aggregate([
    { $match: { pin: { $in: pinStats.flatMap((st) => st.pinIds) } } },
    { $group: { _id: '$pin', n: { $sum: 1 } } },
  ]) : [];
  const commentsByProject = new Map();
  for (const c of commentCounts) {
    const projectId = projectOfPin.get(c._id.toString());
    commentsByProject.set(projectId, (commentsByProject.get(projectId) || 0) + c.n);
  }
  const statsByProject = new Map(pinStats.map((st) => [
    st._id.toString(),
    { resolved: st.resolved, total: st.total, comments: commentsByProject.get(st._id.toString()) || 0 },
  ]));
  const projectsWithCounts = projects.map((project, i) => {
    const stats = statsByProject.get(project._id.toString());
    return {
      ...project,
      // Lean documents skip the schema's toJSON transform: strip the share secrets here
      shareSettings: shareSettingsFor(project.shareSettings, levels[i]),
      access: levels[i],
      workspace: project.workspace || defaultWs._id,
      commentCount: stats?.comments || 0,
      openPinCount: (stats?.total || 0) - (stats?.resolved || 0),
      resolvedPinCount: stats?.resolved || 0,
    };
  });

  res.json({ projects: projectsWithCounts });
});

exports.getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId)
    .populate('owner', 'name email lastSeen')
    .populate('members', 'name email role lastSeen avatar');

  // Workspace members see the project too: offered for @mentions and presence
  const { workspaceMemberUsers } = require('../utils/workspaces');
  const workspaceMembers = await workspaceMemberUsers(project, 'name email role lastSeen avatar');
  res.json({
    project: { ...project.toJSON(), shareSettings: shareSettingsFor(project.shareSettings, req.access) },
    access: req.access,
    workspaceMembers,
    proxyToken: signProxyToken(req.user, project._id),
  });
});

exports.getWorkspaceMembers = asyncHandler(async (req, res) => {
  const project = req.project;
  const orgId = project.organization;

  if (!orgId) {
    return res.json({ members: [] });
  }

  const excludedIds = [
    project.owner?.toString?.() || project.owner,
    ...(project.members || []).map((member) => member.toString()),
  ].filter(Boolean);

  const members = await User.find({
    organization: orgId,
    _id: { $nin: excludedIds },
  })
    .sort({ name: 1, email: 1 })
    .select('name email role avatar lastSeen');

  res.json({ members });
});

exports.updateProject = asyncHandler(async (req, res) => {
  const { name, websiteUrl, status, projectStatus, workspace, settings } = req.body;
  const project = req.project;

  // Needs 'manage' on this project (creator, org admins, or granted)
  if (req.access !== 'manage') {
    return res.status(403).json({ message: 'Only the project owner or admin can update' });
  }

  if (websiteUrl !== undefined && websiteUrl !== null && websiteUrl !== '' && !isValidWebsiteUrl(websiteUrl)) {
    return res.status(400).json({ message: INVALID_WEBSITE_URL });
  }

  const oldProjectStatus = project.projectStatus;
  const oldStatus = project.status;

  if (name) project.name = name;
  // A new address gets a new thumbnail (the stored one of the old address is deleted after the save)
  let replacedThumbnail = null;
  if (websiteUrl && websiteUrl !== project.websiteUrl) {
    project.websiteUrl = websiteUrl;
    if (project.projectType === 'website') {
      if (isStoredThumbnail(project.thumbnail)) replacedThumbnail = project.thumbnail;
      project.thumbnail = mshotsUrl(websiteUrl);
    }
  }
  if (status && ['active', 'archived'].includes(status)) project.status = status;
  if (projectStatus && ['not_started', 'in_progress', 'in_review', 'changes_requested', 'approved', 'completed'].includes(projectStatus)) project.projectStatus = projectStatus;
  if (workspace) {
    const target = mongoose.isValidObjectId(workspace)
      ? await Workspace.findOne({ _id: workspace, organization: project.organization })
      : null;
    if (!target) return res.status(400).json({ message: 'Workspace not found' });
    // Moving a project in follows the rule for creating one there: manage on
    // the target workspace (its members, and its review link, will see it)
    if (String(target._id) !== String(project.workspace || '')) {
      const { workspaceLevel, atLeast } = require('../utils/access');
      if (!atLeast(workspaceLevel(req.user, target), 'manage')) {
        return res.status(403).json({ message: 'You need to manage a workspace to move projects into it.', code: 'ACCESS_LEVEL' });
      }
      // Members of the old workspace may lose access: their sockets re-join after the move
      const { workspaceOfProject } = require('../utils/workspaces');
      const oldWs = await workspaceOfProject(project);
      req.movedFromMembers = (oldWs?.members || []).map((m) => m.user);
    }
    project.workspace = target._id;
  }
  if (settings && typeof settings === 'object') {
    if (!project.settings) project.settings = {};
    if (typeof settings.captureConsoleErrors === 'boolean') {
      project.settings.captureConsoleErrors = settings.captureConsoleErrors;
    }
    if (typeof settings.guestConsoleCapture === 'boolean') {
      project.settings.guestConsoleCapture = settings.guestConsoleCapture;
    }
  }
  await project.save();
  if (replacedThumbnail) deleteStoredFiles([replacedThumbnail]);
  if (isMshotsUrl(project.thumbnail)) storeWebsiteThumbnail(project._id);
  if (req.movedFromMembers?.length) require('../utils/realtime').reconnectUsers(req.app.get('io'), req.movedFromMembers);

  // Activity log for status changes
  if (projectStatus && projectStatus !== oldProjectStatus) {
    logActivity(project._id, req.user._id, 'project.status_changed', {
      oldStatus: oldProjectStatus,
      newStatus: projectStatus,
    });
  }
  if (status && status !== oldStatus) {
    const action = status === 'archived' ? 'project.archived' : 'project.unarchived';
    logActivity(project._id, req.user._id, action, { projectName: project.name });
  }
  if (name || websiteUrl) {
    logActivity(project._id, req.user._id, 'project.updated', { name, websiteUrl });
  }

  const updated = await Project.findById(project._id)
    .populate('owner', 'name email lastSeen')
    .populate('members', 'name email role lastSeen avatar');

  res.json({ project: updated });
});

exports.deleteProject = asyncHandler(async (req, res) => {
  const project = req.project;

  // Needs 'manage' on this project (creator, org admins, or granted)
  if (req.access !== 'manage') {
    return res.status(403).json({ message: 'Only the project owner or admin can delete' });
  }

  // Pins, comments, versions, activity, notifications, invitations, project
  // integrations and every uploaded file go with the project
  await deleteProjectCascade(project);

  res.json({ message: 'Project deleted' });
});

exports.inviteMember = asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const { email, role: invitedRole, level: invitedLevel } = req.body;
  const project = req.project;

  // Needs 'manage' on this project (creator, org admins, or granted)
  if (req.access !== 'manage') {
    return res.status(403).json({ message: 'Only the project owner or admin can invite members' });
  }

  // Validate and enforce role hierarchy
  const validRoles = ['admin', 'member', 'guest'];
  const roleToAssign = validRoles.includes(invitedRole) ? invitedRole : 'member';

  if (!canAssignRole(req.user.role, roleToAssign)) {
    return res.status(403).json({ message: 'Cannot assign a role higher than your own' });
  }
  // Access level on this project; guests default to view (can comment at most)
  const defaultLevel = roleToAssign === 'guest' ? 'view' : 'comment';
  const levelToGrant = capForRole(isLevel(invitedLevel) ? invitedLevel : defaultLevel, roleToAssign);

  // Check if user already exists
  const user = await User.findOne({ email });

  if (user) {
    // People belong to one organization: someone from another org can't be
    // added to this org's projects (same rule as workspace invitations)
    if (user.organization && user.organization.toString() !== String(project.organization)) {
      return res.status(400).json({ message: 'Already belongs to another organization' });
    }

    // Existing user — add directly to project
    if (project.members.some((m) => m.toString() === user._id.toString())) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    // Organization roles are managed on the Team page: adding someone to a
    // project only grants access to it. People without an organization get
    // the invited role when they join this one (below).
    const userLevel = capForRole(levelToGrant, user.organization ? user.role : roleToAssign);
    project.members.push(user._id);
    project.memberAccess = [...(project.memberAccess || []).filter((m) => m.user.toString() !== user._id.toString()), { user: user._id, level: userLevel }];
    await project.save();

    // Activity log
    logActivity(project._id, req.user._id, 'member.joined', { memberName: user.name, memberEmail: email });

    // Send in-app notification to the invited user
    createSingleNotification({
      io,
      recipientId: user._id,
      actor: req.user,
      projectId: project._id,
      type: 'member_invited',
      title: `${req.user.name || 'Someone'} added you to ${project.name}`,
      message: `You can now ${userLevel === 'manage' ? 'manage' : userLevel === 'comment' ? 'comment on' : 'view'} this project.`,
      metadata: {
        projectName: project.name,
        role: roleToAssign,
        targetMemberName: user.name,
      },
    });

    // In-app notifications to other project members
    createProjectNotifications({
      io,
      projectId: project._id,
      actor: req.user,
      type: 'member_invited',
      message: `${user.name || email} has been added to the project.`,
      metadata: {
        projectName: project.name,
        targetUserId: user._id.toString(),
        targetMemberName: user.name,
        targetMemberEmail: email,
        role: roleToAssign,
      },
      excludeRecipientIds: [user._id.toString()],
    });

    // If user doesn't belong to an org yet, link them
    if (!user.organization && req.user.organization) {
      user.organization = req.user.organization;
      if (!['owner', 'superadmin'].includes(user.role)) user.role = roleToAssign;
      await user.save({ validateBeforeSave: false });
    }

    const updated = await Project.findById(project._id)
      .populate('owner', 'name email lastSeen')
      .populate('members', 'name email role lastSeen avatar');

    return res.json({ project: updated });
  }

  // User doesn't exist — send invitation email
  const existingInvite = await Invitation.findOne({
    email,
    project: project._id,
    status: 'pending',
  });
  if (existingInvite) {
    if (existingInvite.expiresAt <= new Date()) {
      await Invitation.deleteOne({ _id: existingInvite._id });
    } else {
      return res.status(400).json({ message: 'Invitation already sent to this email' });
    }
  }

  // Stored hashed; the raw token only goes in the emailed link
  const { raw: token, token: tokenHash, tokenHashed } = Invitation.newToken();
  const invitation = await Invitation.create({
    email,
    project: project._id,
    organization: req.user.organization,
    invitedBy: req.user._id,
    role: roleToAssign,
    level: levelToGrant,
    token: tokenHash,
    tokenHashed,
  });

  // Activity log
  logActivity(project._id, req.user._id, 'member.invited', { memberEmail: email, role: roleToAssign });

  // In-app notifications to other existing project members that an invite was sent
  createProjectNotifications({
    io,
    projectId: project._id,
    actor: req.user,
    type: 'member_invited',
    message: `Invitation sent to ${email}.`,
    metadata: {
      projectName: project.name,
      targetMemberEmail: email,
      role: roleToAssign,
    },
  });

  // Send email
  const clientOrigin = URLS.app;
  const signupUrl = `${clientOrigin}/signup?token=${token}`;
  let emailSent = true;
  let emailError = '';
  try {
    await sendInvitationEmail(email, req.user.name, project.name, signupUrl);
  } catch (err) {
    emailSent = false;
    emailError = err.message || 'Unknown email error';
    console.error('Failed to send invitation email:', err.message);
  }

  await invitation.populate('project', 'name');
  await invitation.populate('invitedBy', 'name email');

  const updated = await Project.findById(project._id)
    .populate('owner', 'name email lastSeen')
    .populate('members', 'name email role lastSeen avatar');

  res.status(201).json({
    message: emailSent
      ? 'Invitation sent'
      : 'Invitation created but email could not be sent. Please check your SMTP settings.',
    project: updated,
    invitation,
    emailSent,
    emailError: emailSent ? undefined : emailError,
  });
});

exports.updateMemberRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || !['admin', 'member', 'guest'].includes(role)) {
    return res.status(400).json({ message: 'Role must be admin, member, or guest' });
  }

  const project = req.project;
  // Organization roles: owners and admins only (project access levels are
  // changed with updateMemberAccess)
  if (!req.isOrgAdmin) {
    return res.status(403).json({ message: 'Only organization owners and admins can change roles' });
  }

  // Enforce role hierarchy
  if (!canAssignRole(req.user.role, role)) {
    return res.status(403).json({ message: 'Cannot assign a role higher than your own' });
  }

  if (req.user._id.toString() === userId) {
    return res.status(400).json({ message: 'Cannot change your own role' });
  }

  // Protect owner role
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({ message: 'User not found' });
  }
  if (targetUser.role === 'owner' || targetUser.role === 'superadmin') {
    return res.status(403).json({ message: "Cannot change the owner's role" });
  }
  // Roles are org-wide: only users of this project's organization can be changed here
  if (!targetUser.organization || !project.organization
    || targetUser.organization.toString() !== project.organization.toString()) {
    return res.status(403).json({ message: 'Cannot change the role of a user from another organization' });
  }

  const isMember = project.members.some((m) => m.toString() === userId);
  if (!isMember) {
    return res.status(404).json({ message: 'User is not a member of this project' });
  }

  // Moving between guest and team roles uses a seat of the other kind
  const isGuestRole = (r) => r === 'guest';
  if (isGuestRole(targetUser.role) !== isGuestRole(role)) {
    const seatError = await seatLimitError(req.organization, role);
    if (seatError) return res.status(403).json(seatError);
  }

  await User.findByIdAndUpdate(userId, { role });
  // Access depends on the org role: reconnect their sockets so rooms are re-checked
  require('../utils/realtime').reconnectUsers(req.app.get('io'), [userId]);

  // Activity log
  logActivity(project._id, req.user._id, 'member.role_changed', {
    memberName: targetUser.name,
    newRole: role,
  });

  const updated = await Project.findById(project._id)
    .populate('owner', 'name email lastSeen')
    .populate('members', 'name email role lastSeen avatar');

  res.json({ project: updated });
});

/**
 * PATCH /api/projects/:projectId/members/:userId/access  { level }
 * Access level of one project member: view | comment | manage.
 */
exports.updateMemberAccess = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { level } = req.body || {};
  if (!isLevel(level)) return res.status(400).json({ message: 'Level must be view, comment, or manage' });
  const project = req.project;
  if (!project.members.some((m) => m.toString() === userId)) {
    return res.status(404).json({ message: 'User is not a member of this project' });
  }
  if (project.owner.toString() === userId) {
    return res.status(400).json({ message: "The project's creator always manages it" });
  }
  const target = await User.findById(userId).select('name role');
  const granted = capForRole(level, target?.role);
  project.memberAccess = [...(project.memberAccess || []).filter((m) => m.user.toString() !== userId), { user: userId, level: granted }];
  await project.save();
  logActivity(project._id, req.user._id, 'member.role_changed', { memberName: target?.name, newRole: granted });

  const updated = await Project.findById(project._id)
    .populate('owner', 'name email lastSeen')
    .populate('members', 'name email role lastSeen avatar');
  res.json({ project: updated, level: granted });
});

exports.removeMember = asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const project = req.project;
  const { userId } = req.params;

  // Needs 'manage' on this project (creator, org admins, or granted)
  if (req.access !== 'manage') {
    return res.status(403).json({ message: 'Only the project owner or admin can remove members' });
  }

  if (project.owner.toString() === userId) {
    return res.status(400).json({ message: 'Cannot remove the project owner' });
  }

  // Protect platform owner from being removed
  const targetUser = await User.findById(userId);
  if (targetUser && targetUser.role === 'owner') {
    return res.status(403).json({ message: "Cannot remove the organization owner" });
  }

  project.members = project.members.filter((m) => m.toString() !== userId);
  project.memberAccess = (project.memberAccess || []).filter((m) => m.user.toString() !== userId);
  await project.save();
  await User.findByIdAndUpdate(userId, { $pull: { mutedProjectEmails: project._id } });
  // Their open tabs stop receiving this project's events (unless the
  // workspace or their org role still gives them access)
  await require('../utils/realtime').leaveProjectIfNoAccess(io, targetUser, project);

  // Activity log
  logActivity(project._id, req.user._id, 'member.removed', {
    memberName: targetUser?.name,
  });

  // 1) In-app notification to the removed member
  if (targetUser) {
    createSingleNotification({
      io,
      recipientId: targetUser._id,
      actor: req.user,
      projectId: project._id,
      type: 'member_removed',
      title: `${req.user.name || 'Someone'} removed you from ${project.name}`,
      message: `You are no longer a member of ${project.name}.`,
      metadata: {
        projectName: project.name,
        targetMemberName: targetUser.name,
      },
    });
  }

  // 2) In-app notification to remaining project members
  createProjectNotifications({
    io,
    projectId: project._id,
    actor: req.user,
    type: 'member_removed',
    message: `${targetUser?.name || 'A member'} was removed from the project.`,
    metadata: {
      projectName: project.name,
      targetMemberName: targetUser?.name,
    },
    excludeRecipientIds: targetUser ? [targetUser._id.toString()] : [],
  });

  const updated = await Project.findById(project._id)
    .populate('owner', 'name email lastSeen')
    .populate('members', 'name email role lastSeen avatar');

  res.json({ project: updated });
});

/**
 * GET /api/projects/:projectId/activity
 * Returns paginated activity log for a project.
 */
exports.getActivity = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 30));
  const skip = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    Activity.find({ project: projectId })
      .populate('actor', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Activity.countDocuments({ project: projectId }),
  ]);

  res.json({
    activities,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * POST /api/projects/:projectId/share
 * Enable sharing and generate a share token.
 */
exports.enableShare = asyncHandler(async (req, res) => {
  const project = req.project;

  // Needs 'manage' on this project (creator, org admins, or granted)
  if (req.access !== 'manage') {
    return res.status(403).json({ message: 'Only the project owner or admin can manage sharing' });
  }

  const { password, allowComments = true, expiresAt } = req.body;
  const passwordError = sharePasswordError(password);
  if (passwordError) return res.status(400).json({ message: passwordError });
  const expiryError = shareExpiryError(expiresAt);
  if (expiryError) return res.status(400).json({ message: expiryError });

  if (!project.shareSettings?.token) {
    project.shareSettings = {
      enabled: true,
      token: crypto.randomBytes(16).toString('hex'),
      password: null,
      passwordHash: await hashSharePassword(password),
      allowComments,
      expiresAt: expiresAt || null,
    };
  } else {
    project.shareSettings.enabled = true;
    // Turned on again after it ran out: an old end date would make it dead at once
    if (expiresAt === undefined && project.shareSettings.expiresAt && new Date(project.shareSettings.expiresAt) <= new Date()) {
      project.shareSettings.expiresAt = null;
    }
    if (password !== undefined) {
      project.shareSettings.password = null;
      project.shareSettings.passwordHash = await hashSharePassword(password);
    }
    if (allowComments !== undefined) project.shareSettings.allowComments = allowComments;
    if (expiresAt !== undefined) project.shareSettings.expiresAt = expiresAt || null;
  }

  await project.save();

  // Activity log
  logActivity(project._id, req.user._id, 'share.enabled');

  const clientOrigin = URLS.app;
  res.json({
    shareSettings: sanitizeShareSettings(project.shareSettings),
    shareUrl: `${clientOrigin}/review/${project.shareSettings.token}`,
  });
});

/**
 * PATCH /api/projects/:projectId/share
 * Update share settings.
 */
exports.updateShare = asyncHandler(async (req, res) => {
  const project = req.project;

  // Needs 'manage' on this project (creator, org admins, or granted)
  if (req.access !== 'manage') {
    return res.status(403).json({ message: 'Only the project owner or admin can manage sharing' });
  }

  const { password, allowComments, expiresAt } = req.body;
  const passwordError = sharePasswordError(password);
  if (passwordError) return res.status(400).json({ message: passwordError });
  const expiryError = shareExpiryError(expiresAt);
  if (expiryError) return res.status(400).json({ message: expiryError });

  if (!project.shareSettings?.token) {
    return res.status(400).json({ message: 'Sharing is not enabled for this project.' });
  }

  if (password !== undefined) {
    project.shareSettings.password = null;
    project.shareSettings.passwordHash = await hashSharePassword(password);
  }
  if (allowComments !== undefined) project.shareSettings.allowComments = allowComments;
  if (expiresAt !== undefined) project.shareSettings.expiresAt = expiresAt || null;

  await project.save();

  const clientOrigin = URLS.app;
  res.json({
    shareSettings: sanitizeShareSettings(project.shareSettings),
    shareUrl: `${clientOrigin}/review/${project.shareSettings.token}`,
  });
});

/**
 * DELETE /api/projects/:projectId/share
 * Disable sharing.
 */
exports.disableShare = asyncHandler(async (req, res) => {
  const project = req.project;

  // Needs 'manage' on this project (creator, org admins, or granted)
  if (req.access !== 'manage') {
    return res.status(403).json({ message: 'Only the project owner or admin can manage sharing' });
  }

  if (project.shareSettings) {
    project.shareSettings.enabled = false;
  }
  await project.save();

  // Activity log
  logActivity(project._id, req.user._id, 'share.disabled');

  res.json({ message: 'Sharing disabled' });
});

/**
 * PATCH /api/projects/:projectId/email-notifications
 * Toggle or set email notifications preference for the current user on this project.
 * Body: { enabled: boolean }
 */
exports.updateProjectEmailNotifications = asyncHandler(async (req, res) => {
  const projectId = req.project._id;
  const userId = req.user._id;
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ message: 'The "enabled" boolean field is required' });
  }

  let user;
  if (!enabled) {
    user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { mutedProjectEmails: projectId } },
      { returnDocument: 'after' }
    );
  } else {
    user = await User.findByIdAndUpdate(
      userId,
      { $pull: { mutedProjectEmails: projectId } },
      { returnDocument: 'after' }
    );
  }

  const mutedProjectEmails = (user.mutedProjectEmails || []).map((id) => id.toString());

  res.json({
    message: enabled
      ? 'Email notifications enabled for this project'
      : 'Email notifications muted for this project',
    emailNotificationsEnabled: enabled,
    mutedProjectEmails,
  });
});

/**
 * PATCH /api/projects/:projectId/review
 * Update the feedback deadline (deadlineAt, deadlineMessage).
 */
exports.updateReviewSettings = asyncHandler(async (req, res) => {
  const { deadlineAt, deadlineMessage } = req.body;
  const project = req.project;

  project.review = project.review || {};

  if (deadlineAt !== undefined) {
    project.review.deadlineAt = deadlineAt ? new Date(deadlineAt) : null;
  }
  if (deadlineMessage !== undefined) {
    project.review.deadlineMessage = String(deadlineMessage || '').slice(0, 500);
  }

  await project.save();

  logActivity(project._id, req.user._id, 'project.updated', {
    updatedFields: ['review'],
    deadlineAt: project.review.deadlineAt,
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`project:${project._id}`).emit('project:review_updated', {
      review: project.review,
    });
  }

  res.json({ review: project.review });
});

