const router = require('express').Router();
const auth = require('../middleware/auth');
const projectAccess = require('../middleware/projectAccess');
const {
  getInvitation,
  getProjectInvitations,
  cancelInvitation,
} = require('../controllers/invitation.controller');

// Public — no auth (for signup page to verify token)
router.get('/:token', getInvitation);

// Auth required
router.delete('/:invitationId', auth, cancelInvitation);

module.exports = router;
