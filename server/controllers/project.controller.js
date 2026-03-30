const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Project = require('../models/Project');
const User = require('../models/User');
const Pin = require('../models/Pin');
const Comment = require('../models/Comment');
const Invitation = require('../models/Invitation');
const Activity = require('../models/Activity');
const asyncHandler = require('../utils/asyncHandler');
const { sendInvitationEmail } = require('../utils/mailer');
const { canAssignRole } = require('../middleware/roles');
const { logActivity } = require('../utils/activityLogger');

exports.createProject = asyncHandler(async (req, res) => {
  const { name, websiteUrl, projectType = 'website' } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Project name is required' });
  }

  if (projectType === 'website' && !websiteUrl) {
    return res.status(400).json({ message: 'Website URL is required for website projects' });
  }

  if (projectType === 'document' && (!req.files || req.files.length === 0)) {
    return res.status(400).json({ message: 'At least one document file is required' });
  }

  const orgId = req.user.organization;
  const existing = await Project.findOne({
    organization: orgId,
    name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  });
  if (existing) {
    return res.status(400).json({ message: 'A project with this name already exists' });
  }

  const projectData = {
    name,
    projectType,
    owner: req.user._id,
    organization: orgId,
    members: [req.user._id],
  };

  if (projectType === 'website') {
    projectData.websiteUrl = websiteUrl;
  } else {
    // Build documents array from uploaded files
    const documents = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      let pageCount = 1;

      if (file.mimetype === 'application/pdf') {
        try {
          const pdfParse = require('pdf-parse');
          const dataBuffer = fs.readFileSync(file.path);
          const pdfData = await pdfParse(dataBuffer);
          pageCount = pdfData.numpages || 1;
        } catch (err) {
          console.error('Failed to parse PDF page count:', err.message);
        }
      }

      documents.push({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: `uploads/documents/${file.filename}`,
        pageCount,
        order: i,
      });
    }
    projectData.documents = documents;
  }

  const project = await Project.create(projectData);

  // Activity log
  logActivity(project._id, req.user._id, 'project.created', { projectName: name });

  res.status(201).json({ project });
});

exports.getProjects = asyncHandler(async (req, res) => {
  const orgId = req.user.organization;
  const isPlatformAdmin = req.user.role === 'admin' || req.user.role === 'owner';

  // Admins/owners see all org projects; members/guests see only their projects
  const query = isPlatformAdmin
    ? { organization: orgId }
    : { organization: orgId, members: req.user._id };

  const projects = await Project.find(query)
    .populate('owner', 'name email lastSeen')
    .populate('members', 'name email role lastSeen avatar');

  res.json({ projects });
});

exports.getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId)
    .populate('owner', 'name email lastSeen')
    .populate('members', 'name email role lastSeen avatar');

  res.json({ project });
});

exports.updateProject = asyncHandler(async (req, res) => {
  const { name, websiteUrl, status, projectStatus } = req.body;
  const project = req.project;

  const isProjectOwner = project.owner.toString() === req.user._id.toString();
  const isPlatformAdmin = req.user.role === 'admin' || req.user.role === 'owner';
  if (!isProjectOwner && !isPlatformAdmin) {
    return res.status(403).json({ message: 'Only the project owner or admin can update' });
  }

  const oldProjectStatus = project.projectStatus;

  if (name) project.name = name;
  if (websiteUrl) project.websiteUrl = websiteUrl;
  if (status && ['active', 'archived'].includes(status)) project.status = status;
  if (projectStatus && ['not_started', 'in_progress', 'in_review', 'approved', 'completed'].includes(projectStatus)) project.projectStatus = projectStatus;
  await project.save();

  // Activity log for status changes
  if (projectStatus && projectStatus !== oldProjectStatus) {
    logActivity(project._id, req.user._id, 'project.status_changed', {
      oldStatus: oldProjectStatus,
      newStatus: projectStatus,
    });
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

  const isProjectOwner = project.owner.toString() === req.user._id.toString();
  const isPlatformAdmin = req.user.role === 'admin' || req.user.role === 'owner';
  if (!isProjectOwner && !isPlatformAdmin) {
    return res.status(403).json({ message: 'Only the project owner or admin can delete' });
  }

  // Cascade delete pins and comments
  const pins = await Pin.find({ project: project._id });
  const pinIds = pins.map((p) => p._id);
  await Comment.deleteMany({ pin: { $in: pinIds } });
  await Pin.deleteMany({ project: project._id });

  // Clean up uploaded document files
  if (project.projectType === 'document' && project.documents) {
    for (const doc of project.documents) {
      const filePath = path.join(__dirname, '..', doc.path);
      try { fs.unlinkSync(filePath); } catch {}
    }
  }

  await Project.findByIdAndDelete(project._id);

  res.json({ message: 'Project deleted' });
});

exports.inviteMember = asyncHandler(async (req, res) => {
  const { email, role: invitedRole } = req.body;
  const project = req.project;

  // Authorization: only project owner, platform admin, or platform owner can invite
  const isProjectOwner = project.owner.toString() === req.user._id.toString();
  const isPlatformAdmin = req.user.role === 'admin' || req.user.role === 'owner';
  if (!isProjectOwner && !isPlatformAdmin) {
    return res.status(403).json({ message: 'Only the project owner or admin can invite members' });
  }

  // Validate and enforce role hierarchy
  const validRoles = ['admin', 'member', 'guest'];
  const roleToAssign = validRoles.includes(invitedRole) ? invitedRole : 'member';

  if (!canAssignRole(req.user.role, roleToAssign)) {
    return res.status(403).json({ message: 'Cannot assign a role higher than your own' });
  }

  // Check if user already exists
  const user = await User.findOne({ email });

  if (user) {
    // Existing user — add directly to project
    if (project.members.some((m) => m.toString() === user._id.toString())) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    project.members.push(user._id);
    await project.save();

    // Activity log
    logActivity(project._id, req.user._id, 'member.joined', { memberName: user.name, memberEmail: email });

    // If user doesn't belong to an org yet, link them
    if (!user.organization && req.user.organization) {
      user.organization = req.user.organization;
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
    return res.status(400).json({ message: 'Invitation already sent to this email' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const invitation = await Invitation.create({
    email,
    project: project._id,
    organization: req.user.organization,
    invitedBy: req.user._id,
    role: roleToAssign,
    token,
  });

  // Activity log
  logActivity(project._id, req.user._id, 'member.invited', { memberEmail: email, role: roleToAssign });

  // Send email
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
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

  res.status(201).json({
    message: emailSent
      ? 'Invitation sent'
      : 'Invitation created but email could not be sent. Please check your SMTP settings.',
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
  const isProjectOwner = project.owner.toString() === req.user._id.toString();
  const isPlatformAdmin = req.user.role === 'admin' || req.user.role === 'owner';
  if (!isProjectOwner && !isPlatformAdmin) {
    return res.status(403).json({ message: 'Only the project owner or admin can change roles' });
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
  if (targetUser.role === 'owner') {
    return res.status(403).json({ message: "Cannot change the owner's role" });
  }

  const isMember = project.members.some((m) => m.toString() === userId);
  if (!isMember) {
    return res.status(404).json({ message: 'User is not a member of this project' });
  }

  await User.findByIdAndUpdate(userId, { role });

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

exports.removeMember = asyncHandler(async (req, res) => {
  const project = req.project;
  const { userId } = req.params;

  const isProjectOwner = project.owner.toString() === req.user._id.toString();
  const isPlatformAdmin = req.user.role === 'admin' || req.user.role === 'owner';
  if (!isProjectOwner && !isPlatformAdmin) {
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
  await project.save();

  // Activity log
  logActivity(project._id, req.user._id, 'member.removed', {
    memberName: targetUser?.name,
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

  const isProjectOwner = project.owner.toString() === req.user._id.toString();
  const isPlatformAdmin = req.user.role === 'admin' || req.user.role === 'owner';
  if (!isProjectOwner && !isPlatformAdmin) {
    return res.status(403).json({ message: 'Only the project owner or admin can manage sharing' });
  }

  const { password, allowComments = true, expiresAt } = req.body;

  if (!project.shareSettings?.token) {
    project.shareSettings = {
      enabled: true,
      token: crypto.randomBytes(16).toString('hex'),
      password: password || null,
      allowComments,
      expiresAt: expiresAt || null,
    };
  } else {
    project.shareSettings.enabled = true;
    if (password !== undefined) project.shareSettings.password = password || null;
    if (allowComments !== undefined) project.shareSettings.allowComments = allowComments;
    if (expiresAt !== undefined) project.shareSettings.expiresAt = expiresAt || null;
  }

  await project.save();

  // Activity log
  logActivity(project._id, req.user._id, 'share.enabled');

  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
  res.json({
    shareSettings: project.shareSettings,
    shareUrl: `${clientOrigin}/review/${project.shareSettings.token}`,
  });
});

/**
 * PATCH /api/projects/:projectId/share
 * Update share settings.
 */
exports.updateShare = asyncHandler(async (req, res) => {
  const project = req.project;

  const isProjectOwner = project.owner.toString() === req.user._id.toString();
  const isPlatformAdmin = req.user.role === 'admin' || req.user.role === 'owner';
  if (!isProjectOwner && !isPlatformAdmin) {
    return res.status(403).json({ message: 'Only the project owner or admin can manage sharing' });
  }

  const { password, allowComments, expiresAt } = req.body;

  if (!project.shareSettings?.token) {
    return res.status(400).json({ message: 'Sharing is not enabled for this project.' });
  }

  if (password !== undefined) project.shareSettings.password = password || null;
  if (allowComments !== undefined) project.shareSettings.allowComments = allowComments;
  if (expiresAt !== undefined) project.shareSettings.expiresAt = expiresAt || null;

  await project.save();

  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
  res.json({
    shareSettings: project.shareSettings,
    shareUrl: `${clientOrigin}/review/${project.shareSettings.token}`,
  });
});

/**
 * DELETE /api/projects/:projectId/share
 * Disable sharing.
 */
exports.disableShare = asyncHandler(async (req, res) => {
  const project = req.project;

  const isProjectOwner = project.owner.toString() === req.user._id.toString();
  const isPlatformAdmin = req.user.role === 'admin' || req.user.role === 'owner';
  if (!isProjectOwner && !isPlatformAdmin) {
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
