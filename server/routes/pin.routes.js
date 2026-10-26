const router = require('express').Router();
const auth = require('../middleware/auth');
const projectAccess = require('../middleware/projectAccess');
const { requireAccess } = projectAccess;
const { checkOrgNotLocked } = require('../middleware/orgLimits');
const upload = require('../middleware/upload');
const { enforceStorageQuota } = require('../utils/storage');
const {
  createPin,
  getPins,
  updatePin,
  attachScreenshot,
  deletePin,
} = require('../controllers/pin.controller');

router.use(auth);

router.post('/:projectId/pins', projectAccess, requireAccess('comment'), checkOrgNotLocked, upload.single('screenshot'), enforceStorageQuota, createPin);
router.get('/:projectId/pins', projectAccess, getPins);
router.patch('/:projectId/pins/:pinId', projectAccess, requireAccess('comment'), checkOrgNotLocked, updatePin);
router.patch('/:projectId/pins/:pinId/screenshot', projectAccess, requireAccess('comment'), checkOrgNotLocked, upload.single('screenshot'), enforceStorageQuota, attachScreenshot);
router.delete('/:projectId/pins/:pinId', projectAccess, requireAccess('comment'), checkOrgNotLocked, deletePin);

module.exports = router;
