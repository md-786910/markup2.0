const crypto = require('crypto');
const Project = require('../models/Project');
const User = require('../models/User');
const Pin = require('../models/Pin');
const Comment = require('../models/Comment');
const Invitation = require('../models/Invitation');
const asyncHandler = require('../utils/asyncHandler');
const { sendInvitationEmail } = require('../utils/mailer');
const { canAssignRole } = require('../middleware/roles');

exports.createProject = asyncHandler(async (req, res) => {
  const { name, websiteUrl } = req.body;

  if (!name || !websiteUrl) {
    return res.status(400).json({ message: 'Name and website URL are required' });
  }

  const orgId = req.user.organization;
  const existing = await Project.findOne({
    organization: orgId,
    name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  });
  if (existing) {
    return res.status(400).json({ message: 'A project with this name already exists' });
  }

  const project = await Project.create({
    name,
    websiteUrl,
    owner: req.user._id,
    organization: orgId,
    members: [req.user._id],
  });

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

  if (name) project.name = name;
  if (websiteUrl) project.websiteUrl = websiteUrl;
  if (status && ['active', 'archived'].includes(status)) project.status = status;
  if (projectStatus && ['not_started', 'in_progress', 'in_review', 'approved', 'completed'].includes(projectStatus)) project.projectStatus = projectStatus;
  await project.save();

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

  const updated = await Project.findById(project._id)
    .populate('owner', 'name email lastSeen')
    .populate('members', 'name email role lastSeen avatar');

  res.json({ project: updated });
});
