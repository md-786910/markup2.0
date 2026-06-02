const router = require('express').Router();
const auth = require('../middleware/auth');
const projectAccess = require('../middleware/projectAccess');
const {
  getInvitation,
  getProjectInvitations,
  cancelInvitation,
  resendInvitation,
} = require('../controllers/invitation.controller');

// Public — no auth (for signup page to verify token)
router.get('/:token', getInvitation);

// Auth required
router.post('/:invitationId/resend', auth, resendInvitation);
router.delete('/:invitationId', auth, cancelInvitation);

module.exports = router;
