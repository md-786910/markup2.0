const Invitation = require('../models/Invitation');
const asyncHandler = require('../utils/asyncHandler');

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

  const invitations = await Invitation.find({
    project: projectId,
    status: 'pending',
    expiresAt: { $gt: new Date() },
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
