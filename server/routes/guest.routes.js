const router = require('express').Router();
const uploadDocument = require('../middleware/uploadDocument');
const { guestDecisionLimiter } = require('../middleware/rateLimiters');
const {
  getGuestProject,
  getGuestPins,
  getGuestComments,
  createGuestPin,
  createGuestComment,
  getGuestWorkspace,
  recordGuestDecision,
} = require('../controllers/guest.controller');

// All guest routes are public — no auth middleware
router.get('/workspace/:workspaceToken', getGuestWorkspace);
router.get('/:shareToken', getGuestProject);
router.get('/:shareToken/pins', getGuestPins);
router.get('/:shareToken/pins/:pinId/comments', getGuestComments);
router.post('/:shareToken/pins', createGuestPin);
router.post('/:shareToken/pins/:pinId/comments', uploadDocument.array('attachments', 5), createGuestComment);
router.post('/:shareToken/decision', guestDecisionLimiter, recordGuestDecision);

module.exports = router;
