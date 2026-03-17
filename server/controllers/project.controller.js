const crypto = require('crypto');
const Project = require('../models/Project');
const User = require('../models/User');
const Pin = require('../models/Pin');
const Comment = require('../models/Comment');
const Invitation = require('../models/Invitation');
const asyncHandler = require('../utils/asyncHandler');
const { sendInvitationEmail } = require('../utils/mailer');

exports.createProject = asyncHandler(async (req, res) => {
  const { name, websiteUrl } = req.body;

  if (!name || !websiteUrl) {
    return res.status(400).json({ message: 'Name and website URL are required' });
  }

  const project = await Project.create({
    name,
    websiteUrl,
    owner: req.user._id,
    members: [req.user._id],
  });

  res.status(201).json({ project });
});

exports.getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({
    members: req.user._id,
  }).populate('owner', 'name email').populate('members', 'name email role');

  res.json({ projects });
});

exports.getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId)
    .populate('owner', 'name email')
    .populate('members', 'name email role');

  res.json({ project });
});

exports.updateProject = asyncHandler(async (req, res) => {
  const { name, websiteUrl, status } = req.body;
  const project = req.project;

  if (project.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Only the project owner can update' });
  }

  if (name) project.name = name;
  if (websiteUrl) project.websiteUrl = websiteUrl;
  if (status && ['active', 'archived'].includes(status)) project.status = status;
  await project.save();

  const updated = await Project.findById(project._id)
    .populate('owner', 'name email')
    .populate('members', 'name email role');

  res.json({ project: updated });
});

exports.deleteProject = asyncHandler(async (req, res) => {
  const project = req.project;

  if (project.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Only the project owner can delete' });
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
  const { email } = req.body;
  const project = req.project;

  const isOwner = project.owner.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only the project owner or admin can invite members' });
  }

  // Check if user already exists
  const user = await User.findOne({ email });

  if (user) {
    // Existing user — add directly
    if (project.members.some((m) => m.toString() === user._id.toString())) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    project.members.push(user._id);
    await project.save();

    const updated = await Project.findById(project._id)
      .populate('owner', 'name email')
      .populate('members', 'name email role');

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
    invitedBy: req.user._id,
    token,
  });

  // Send email (non-blocking — don't fail the request if email fails)
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
  const signupUrl = `${clientOrigin}/signup?token=${token}`;
  try {
    await sendInvitationEmail(email, req.user.name, project.name, signupUrl);
  } catch (err) {
    console.error('Failed to send invitation email:', err.message);
  }

  await invitation.populate('project', 'name');
  await invitation.populate('invitedBy', 'name email');

  res.status(201).json({
    message: 'Invitation sent',
    invitation,
  });
});

exports.updateMemberRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || !['admin', 'member'].includes(role)) {
    return res.status(400).json({ message: 'Role must be admin or member' });
  }

  const project = req.project;
  const isOwner = project.owner.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only the project owner or admin can change roles' });
  }

  if (req.user._id.toString() === userId) {
    return res.status(400).json({ message: 'Cannot change your own role' });
  }

  const isMember = project.members.some((m) => m.toString() === userId);
  if (!isMember) {
    return res.status(404).json({ message: 'User is not a member of this project' });
  }

  await User.findByIdAndUpdate(userId, { role });

  const updated = await Project.findById(project._id)
    .populate('owner', 'name email')
    .populate('members', 'name email role');

  res.json({ project: updated });
});

exports.removeMember = asyncHandler(async (req, res) => {
  const project = req.project;
  const { userId } = req.params;

  const isOwner = project.owner.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only the project owner or admin can remove members' });
  }

  if (project.owner.toString() === userId) {
    return res.status(400).json({ message: 'Cannot remove the project owner' });
  }

  project.members = project.members.filter((m) => m.toString() !== userId);
  await project.save();

  const updated = await Project.findById(project._id)
    .populate('owner', 'name email')
    .populate('members', 'name email role');

  res.json({ project: updated });
});
