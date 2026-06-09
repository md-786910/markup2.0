const router = require('express').Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const projectAccess = require('../middleware/projectAccess');
const { checkOrgNotLocked, checkProjectLimit, checkMemberLimit, checkGuestLimit, checkActivityLogsLimit } = require('../middleware/orgLimits');
const uploadDocument = require('../middleware/uploadDocument');
const {
  createProject,
  getProjects,
  getProject,
  getWorkspaceMembers,
  updateProject,
  deleteProject,
  inviteMember,
  removeMember,
  updateMemberRole,
  getActivity,
  enableShare,
  updateShare,
  disableShare,
} = require('../controllers/project.controller');

router.use(auth);

router.post('/', authorize('owner', 'admin'), checkOrgNotLocked, checkProjectLimit, uploadDocument.array('documents', 10), createProject);
router.get('/', getProjects);
router.get('/:projectId', projectAccess, getProject);
router.patch('/:projectId', projectAccess, authorize('owner', 'admin'), checkOrgNotLocked, updateProject);
router.delete('/:projectId', projectAccess, authorize('owner', 'admin'), checkOrgNotLocked, deleteProject);
router.get('/:projectId/invitations', projectAccess, require('../controllers/invitation.controller').getProjectInvitations);
router.get('/:projectId/workspace-members', projectAccess, getWorkspaceMembers);
router.post('/:projectId/members', projectAccess, checkOrgNotLocked, checkMemberLimit, checkGuestLimit, inviteMember);
router.patch('/:projectId/members/:userId/role', projectAccess, checkOrgNotLocked, updateMemberRole);
router.delete('/:projectId/members/:userId', projectAccess, checkOrgNotLocked, removeMember);
router.get('/:projectId/activity', projectAccess, checkActivityLogsLimit, getActivity);
router.post('/:projectId/share', projectAccess, authorize('owner', 'admin'), enableShare);
router.patch('/:projectId/share', projectAccess, authorize('owner', 'admin'), updateShare);
router.delete('/:projectId/share', projectAccess, authorize('owner', 'admin'), disableShare);

module.exports = router;
