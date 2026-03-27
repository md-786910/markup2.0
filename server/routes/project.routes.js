const router = require('express').Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const projectAccess = require('../middleware/projectAccess');
const { checkOrgNotLocked, checkProjectLimit, checkMemberLimit, checkGuestLimit } = require('../middleware/orgLimits');
const uploadDocument = require('../middleware/uploadDocument');
const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  inviteMember,
  removeMember,
  updateMemberRole,
} = require('../controllers/project.controller');

router.use(auth);

router.post('/', authorize('owner', 'admin'), checkOrgNotLocked, checkProjectLimit, uploadDocument.array('documents', 10), createProject);
router.get('/', getProjects);
router.get('/:projectId', projectAccess, getProject);
router.patch('/:projectId', projectAccess, authorize('owner', 'admin'), updateProject);
router.delete('/:projectId', projectAccess, authorize('owner', 'admin'), deleteProject);
router.get('/:projectId/invitations', projectAccess, require('../controllers/invitation.controller').getProjectInvitations);
router.post('/:projectId/members', projectAccess, checkOrgNotLocked, checkMemberLimit, checkGuestLimit, inviteMember);
router.patch('/:projectId/members/:userId/role', projectAccess, updateMemberRole);
router.delete('/:projectId/members/:userId', projectAccess, removeMember);

module.exports = router;
