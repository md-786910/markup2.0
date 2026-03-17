const router = require('express').Router();
const auth = require('../middleware/auth');
const projectAccess = require('../middleware/projectAccess');
const {
  createPin,
  getPins,
  updatePin,
  deletePin,
} = require('../controllers/pin.controller');

router.use(auth);

router.post('/:projectId/pins', projectAccess, createPin);
router.get('/:projectId/pins', projectAccess, getPins);
router.patch('/:projectId/pins/:pinId', projectAccess, updatePin);
router.delete('/:projectId/pins/:pinId', projectAccess, deletePin);

module.exports = router;
