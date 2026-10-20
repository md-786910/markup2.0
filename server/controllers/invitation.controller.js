const crypto = require('crypto');
const Invitation = require('../models/Invitation');
const asyncHandler = require('../utils/asyncHandler');
const { sendInvitationEmail } = require('../utils/mailer');

// GET /api/invitations/:token — public, no auth required
exports.getInvitation = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const invitation = await Invitation.findOne({ token, status: 'pending' })
    .populate('project', 'name websiteUrl')
    .populate('invitedBy', 'name');

  if (!invitation) {
    return res.status(404).json({ message: 'Invitation not found or already used' });
  }

  if (invitation.expiresAt < new Date()) {
    return res.status(410).json({ message: 'Invitation has expired' });
  }

  res.json({
    invitation: {
      email: invitation.email,
      projectName: invitation.project?.name,
      invitedBy: invitation.invitedBy?.name,
    },
  });
});

// GET /api/projects/:projectId/invitations — auth required
exports.getProjectInvitations = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const now = new Date();

  // Expired invitations are no longer useful and should not remain in the
  // pending-invitations list.
  await Invitation.deleteMany({
    project: projectId,
    status: 'pending',
    expiresAt: { $lte: now },
  });

  const invitations = await Invitation.find({
    project: projectId,
    status: 'pending',
  })
    .populate('invitedBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ invitations });
});

// DELETE /api/invitations/:invitationId — auth required
exports.cancelInvitation = asyncHandler(async (req, res) => {
  const { invitationId } = req.params;

  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    return res.status(404).json({ message: 'Invitation not found' });
  }

  await Invitation.findByIdAndDelete(invitationId);
  res.json({ message: 'Invitation cancelled' });
});

// POST /api/invitations/:invitationId/resend - auth required
exports.resendInvitation = asyncHandler(async (req, res) => {
  const { invitationId } = req.params;

  const invitation = await Invitation.findById(invitationId)
    .populate('project', 'name owner')
    .populate('invitedBy', 'name email');

  if (!invitation || invitation.status !== 'pending') {
    return res.status(404).json({ message: 'Pending invitation not found' });
  }

  const sameOrg = invitation.organization?.toString() === req.user.organization?.toString();
  const isProjectOwner = invitation.project?.owner?.toString() === req.user._id.toString();
  const isPlatformAdmin = req.user.role === 'admin' || req.user.role === 'owner';
  if (!sameOrg || (!isProjectOwner && !isPlatformAdmin)) {
    return res.status(403).json({ message: 'Not authorized to resend this invitation' });
  }

  // Rotate the token so any link in an earlier email remains invalid.
  invitation.token = crypto.randomBytes(32).toString('hex');
  invitation.expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  await invitation.save();

  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
  const signupUrl = `${clientOrigin}/signup?token=${invitation.token}`;

  try {
    await sendInvitationEmail(
      invitation.email,
      req.user.name || invitation.invitedBy?.name || 'A teammate',
      invitation.project?.name || 'a project',
      signupUrl
    );
  } catch (err) {
    console.error('Failed to resend invitation email:', err.message);
    return res.status(500).json({
      message: 'Invitation was updated but email could not be sent. Please check your SMTP settings.',
      emailSent: false,
    });
  }

  res.json({
    message: 'Invitation resent',
    invitation,
    emailSent: true,
  });
});
