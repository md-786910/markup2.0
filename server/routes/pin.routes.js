const router = require('express').Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const projectAccess = require('../middleware/projectAccess');
const { checkOrgNotLocked } = require('../middleware/orgLimits');
const upload = require('../middleware/upload');
const {
  createPin,
  getPins,
  updatePin,
  attachScreenshot,
  deletePin,
} = require('../controllers/pin.controller');

router.use(auth);

router.post('/:projectId/pins', projectAccess, authorize('owner', 'admin', 'member'), checkOrgNotLocked, upload.single('screenshot'), createPin);
router.get('/:projectId/pins', projectAccess, getPins);
router.patch('/:projectId/pins/:pinId', projectAccess, authorize('owner', 'admin', 'member'), updatePin);
router.patch('/:projectId/pins/:pinId/screenshot', projectAccess, authorize('owner', 'admin', 'member'), upload.single('screenshot'), attachScreenshot);
router.delete('/:projectId/pins/:pinId', projectAccess, authorize('owner', 'admin', 'member'), deletePin);

module.exports = router;
