const router = require('express').Router();
const auth = require('../middleware/auth');
const projectAccess = require('../middleware/projectAccess');
const upload = require('../middleware/upload');
const {
  createPin,
  getPins,
  updatePin,
  attachScreenshot,
  deletePin,
} = require('../controllers/pin.controller');

router.use(auth);

router.post('/:projectId/pins', projectAccess, upload.single('screenshot'), createPin);
router.get('/:projectId/pins', projectAccess, getPins);
router.patch('/:projectId/pins/:pinId', projectAccess, updatePin);
router.patch('/:projectId/pins/:pinId/screenshot', projectAccess, upload.single('screenshot'), attachScreenshot);
router.delete('/:projectId/pins/:pinId', projectAccess, deletePin);

module.exports = router;
