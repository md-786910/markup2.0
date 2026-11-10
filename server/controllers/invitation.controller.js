const crypto = require('crypto');
const Invitation = require('../models/Invitation');
const asyncHandler = require('../utils/asyncHandler');
const { sendInvitationEmail } = require('../utils/mailer');
const { URLS } = require('../config/env');

// Who may cancel or resend an invitation: people in its organization who can
// manage what it invites to (org owners/admins, the project's creator, and
// anyone with manage access on that project or workspace).
async function canManageInvitation(user, invitation) {
  if (String(invitation.organization || '') !== String(user.organization || '')) return false;
  if (user.role === 'admin' || user.role === 'owner') return true;
  const { projectLevelFor } = require('../utils/workspaces');
  const { workspaceLevel } = require('../utils/access');
  if (invitation.project) {
    const project = await require('../models/Project').findById(invitation.project._id || invitation.project);
    return !!project && (await projectLevelFor(user, project)) === 'manage';
  }
  if (invitation.workspace) {
    const workspace = await require('../models/Workspace').findById(invitation.workspace._id || invitation.workspace);
    return !!workspace && workspaceLevel(user, workspace) === 'manage';
  }
  return false;
}

// GET /api/invitations/:token — public, no auth required
exports.getInvitation = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const invitation = await Invitation.findOne({ token, status: 'pending' })
    .populate('project', 'name websiteUrl')
    .populate('workspace', 'name')
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
      projectName: invitation.project?.name || (invitation.workspace ? `the ${invitation.workspace.name} workspace` : undefined),
      workspaceName: invitation.workspace?.name,
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
    .select('-token') // the token is the invitee's signup credential
    .populate('invitedBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ invitations });
});

// DELETE /api/invitations/:invitationId — auth required
exports.cancelInvitation = asyncHandler(async (req, res) => {
  const { invitationId } = req.params;

  const invitation = require('mongoose').isValidObjectId(invitationId) ? await Invitation.findById(invitationId) : null;
  if (!invitation) {
    return res.status(404).json({ message: 'Invitation not found' });
  }

  if (!(await canManageInvitation(req.user, invitation))) {
    return res.status(403).json({ message: 'Not authorized to cancel this invitation' });
  }

  await Invitation.findByIdAndDelete(invitationId);
  res.json({ message: 'Invitation cancelled' });
});

// POST /api/invitations/:invitationId/resend - auth required
exports.resendInvitation = asyncHandler(async (req, res) => {
  const { invitationId } = req.params;

  const invitation = !require('mongoose').isValidObjectId(invitationId) ? null : await Invitation.findById(invitationId)
    .populate('project', 'name owner')
    .populate('workspace', 'name')
    .populate('invitedBy', 'name email');

  if (!invitation || invitation.status !== 'pending') {
    return res.status(404).json({ message: 'Pending invitation not found' });
  }

  if (!(await canManageInvitation(req.user, invitation))) {
    return res.status(403).json({ message: 'Not authorized to resend this invitation' });
  }

  // Rotate the token so any link in an earlier email remains invalid.
  invitation.token = crypto.randomBytes(32).toString('hex');
  invitation.expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  await invitation.save();

  const clientOrigin = URLS.app;
  const signupUrl = `${clientOrigin}/signup?token=${invitation.token}`;

  try {
    await sendInvitationEmail(
      invitation.email,
      req.user.name || invitation.invitedBy?.name || 'A teammate',
      invitation.project?.name || (invitation.workspace ? `the ${invitation.workspace.name} workspace` : 'a project'),
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
