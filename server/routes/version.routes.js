const router = require('express').Router({ mergeParams: true });
const auth = require('../middleware/auth');
const projectAccess = require('../middleware/projectAccess');
const { requireAccess } = projectAccess;
const { checkVersionHistoryLimit, checkOrgNotLocked } = require('../middleware/orgLimits');
const {
  createVersion,
  getVersions,
  updateVersion,
  deleteVersion,
} = require('../controllers/version.controller');

router.use(auth);

router.post('/:projectId/versions', projectAccess, requireAccess('comment'), checkVersionHistoryLimit, checkOrgNotLocked, createVersion);
router.get('/:projectId/versions', projectAccess, checkVersionHistoryLimit, getVersions);
router.patch('/:projectId/versions/:versionId', projectAccess, requireAccess('manage'), checkVersionHistoryLimit, checkOrgNotLocked, updateVersion);
router.delete('/:projectId/versions/:versionId', projectAccess, requireAccess('manage'), checkVersionHistoryLimit, checkOrgNotLocked, deleteVersion);

module.exports = router;
