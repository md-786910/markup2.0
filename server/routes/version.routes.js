const router = require('express').Router({ mergeParams: true });
const auth = require('../middleware/auth');
const projectAccess = require('../middleware/projectAccess');
const { authorize } = require('../middleware/roles');
const {
  createVersion,
  getVersions,
  updateVersion,
  deleteVersion,
} = require('../controllers/version.controller');

router.use(auth);

router.post('/:projectId/versions', projectAccess, authorize('owner', 'admin', 'member'), createVersion);
router.get('/:projectId/versions', projectAccess, getVersions);
router.patch('/:projectId/versions/:versionId', projectAccess, authorize('owner', 'admin'), updateVersion);
router.delete('/:projectId/versions/:versionId', projectAccess, authorize('owner', 'admin'), deleteVersion);

module.exports = router;
