const router = require('express').Router();
const {
  getGuestProject,
  getGuestPins,
  getGuestComments,
  createGuestPin,
  createGuestComment,
} = require('../controllers/guest.controller');

// All guest routes are public — no auth middleware
router.get('/:shareToken', getGuestProject);
router.get('/:shareToken/pins', getGuestPins);
router.get('/:shareToken/pins/:pinId/comments', getGuestComments);
router.post('/:shareToken/pins', createGuestPin);
router.post('/:shareToken/pins/:pinId/comments', createGuestComment);

module.exports = router;
