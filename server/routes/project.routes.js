const router = require('express').Router();
const auth = require('../middleware/auth');
const projectAccess = require('../middleware/projectAccess');
const { requireAccess } = projectAccess;
const { canCreateProject } = require('../middleware/workspaceAccess');
const { enforceStorageQuota } = require('../utils/storage');
const { checkOrgNotLocked, checkProjectLimit, checkMemberLimit, checkGuestLimit, checkActivityLogsLimit, checkShareLinksAllowed, checkApprovalsLimit } = require('../middleware/orgLimits');
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
  updateMemberAccess,
  getActivity,
  enableShare,
  updateShare,
  disableShare,
  updateProjectEmailNotifications,
  updateReviewSettings,
  recordMemberDecision,
  getApprovals,
} = require('../controllers/project.controller');

router.use(auth);

router.post('/', checkOrgNotLocked, checkProjectLimit, uploadDocument.array('documents', 10), canCreateProject, enforceStorageQuota, createProject);
router.get('/', getProjects);
router.get('/:projectId', projectAccess, getProject);
router.patch('/:projectId', projectAccess, requireAccess('manage'), checkOrgNotLocked, updateProject);
router.delete('/:projectId', projectAccess, requireAccess('manage'), checkOrgNotLocked, deleteProject);
router.patch('/:projectId/email-notifications', projectAccess, updateProjectEmailNotifications);
router.get('/:projectId/invitations', projectAccess, requireAccess('manage'), require('../controllers/invitation.controller').getProjectInvitations);
router.get('/:projectId/workspace-members', projectAccess, requireAccess('manage'), getWorkspaceMembers);
router.post('/:projectId/members', projectAccess, requireAccess('manage'), checkOrgNotLocked, checkMemberLimit, checkGuestLimit, inviteMember);
router.patch('/:projectId/members/:userId/access', projectAccess, requireAccess('manage'), checkOrgNotLocked, updateMemberAccess);
router.patch('/:projectId/members/:userId/role', projectAccess, requireAccess('manage'), checkOrgNotLocked, updateMemberRole);
router.delete('/:projectId/members/:userId', projectAccess, requireAccess('manage'), checkOrgNotLocked, removeMember);
router.get('/:projectId/activity', projectAccess, checkActivityLogsLimit, getActivity);
router.post('/:projectId/share', projectAccess, requireAccess('manage'), checkOrgNotLocked, checkShareLinksAllowed, enableShare);
router.patch('/:projectId/share', projectAccess, requireAccess('manage'), checkOrgNotLocked, updateShare);
router.delete('/:projectId/share', projectAccess, requireAccess('manage'), disableShare);
router.patch('/:projectId/review', projectAccess, requireAccess('manage'), checkOrgNotLocked, checkApprovalsLimit, updateReviewSettings);
router.post('/:projectId/decision', projectAccess, requireAccess('comment'), checkOrgNotLocked, recordMemberDecision);
router.get('/:projectId/approvals', projectAccess, requireAccess('manage'), getApprovals);

module.exports = router;
