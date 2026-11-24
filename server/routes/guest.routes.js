const router = require('express').Router();
const uploadDocument = require('../middleware/uploadDocument');
const { guestPasswordLimiter, guestWriteLimiter } = require('../middleware/rateLimiters');
const {
  getGuestProject,
  getGuestPins,
  getGuestComments,
  createGuestPin,
  createGuestComment,
  getGuestWorkspace,
  requireGuestCommentAccess,
} = require('../controllers/guest.controller');

// All guest routes are public — no auth middleware
router.get('/workspace/:workspaceToken', guestPasswordLimiter, getGuestWorkspace);
router.get('/:shareToken', guestPasswordLimiter, getGuestProject);
router.get('/:shareToken/pins', getGuestPins);
router.get('/:shareToken/pins/:pinId/comments', getGuestComments);
router.post('/:shareToken/pins', guestWriteLimiter, createGuestPin);
// The link is checked before attachments are written to disk
router.post('/:shareToken/pins/:pinId/comments', guestWriteLimiter, requireGuestCommentAccess, uploadDocument.array('attachments', 5), createGuestComment);

module.exports = router;
