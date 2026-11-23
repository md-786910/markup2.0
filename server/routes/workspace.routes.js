const router = require('express').Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { checkOrgNotLocked, checkWorkspaceLimit, checkShareLinksAllowed } = require('../middleware/orgLimits');
const { workspaceAccess } = require('../middleware/workspaceAccess');
const {
  getWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  setWorkspaceMembers,
  enableWorkspaceShare,
  updateWorkspaceShare,
  disableWorkspaceShare,
  getOrgPeople,
  inviteToWorkspace,
  getWorkspaceInvitations,
  updateOrgRole,
  removeOrgMember,
  transferOwnership,
} = require('../controllers/workspace.controller');

router.use(auth);

router.get('/', getWorkspaces);
router.get('/people', getOrgPeople);
router.patch('/people/:userId/role', authorize('owner', 'admin'), updateOrgRole);
router.delete('/people/:userId', authorize('owner', 'admin'), removeOrgMember);
router.post('/people/:userId/transfer-ownership', authorize('owner'), require('../middleware/rateLimiters').authLimiter, transferOwnership);
router.post('/', authorize('owner', 'admin'), checkOrgNotLocked, checkWorkspaceLimit, createWorkspace);
router.patch('/:workspaceId', authorize('owner', 'admin'), checkOrgNotLocked, updateWorkspace);
router.delete('/:workspaceId', authorize('owner', 'admin'), checkOrgNotLocked, deleteWorkspace);

router.get('/:workspaceId/members', workspaceAccess('manage'), getWorkspaceMembers);
router.put('/:workspaceId/members', workspaceAccess('manage'), checkOrgNotLocked, setWorkspaceMembers);
router.get('/:workspaceId/invitations', workspaceAccess('manage'), getWorkspaceInvitations);
router.post('/:workspaceId/invitations', workspaceAccess('manage'), checkOrgNotLocked, inviteToWorkspace);
router.post('/:workspaceId/share', workspaceAccess('manage'), checkOrgNotLocked, checkShareLinksAllowed, enableWorkspaceShare);
router.patch('/:workspaceId/share', workspaceAccess('manage'), checkOrgNotLocked, checkShareLinksAllowed, updateWorkspaceShare);
router.delete('/:workspaceId/share', workspaceAccess('manage'), disableWorkspaceShare);

module.exports = router;
