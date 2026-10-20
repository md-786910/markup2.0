const router = require('express').Router({ mergeParams: true });
const auth = require('../middleware/auth');
const projectAccess = require('../middleware/projectAccess');
const { authorize } = require('../middleware/roles');
const { checkVersionHistoryLimit, checkOrgNotLocked } = require('../middleware/orgLimits');
const {
  createVersion,
  getVersions,
  updateVersion,
  deleteVersion,
} = require('../controllers/version.controller');

router.use(auth);

router.post('/:projectId/versions', projectAccess, authorize('owner', 'admin', 'member'), checkVersionHistoryLimit, checkOrgNotLocked, createVersion);
router.get('/:projectId/versions', projectAccess, checkVersionHistoryLimit, getVersions);
router.patch('/:projectId/versions/:versionId', projectAccess, authorize('owner', 'admin'), checkVersionHistoryLimit, checkOrgNotLocked, updateVersion);
router.delete('/:projectId/versions/:versionId', projectAccess, authorize('owner', 'admin'), checkVersionHistoryLimit, checkOrgNotLocked, deleteVersion);

module.exports = router;
