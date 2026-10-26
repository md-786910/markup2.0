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
} = require('../controllers/workspace.controller');

router.use(auth);

router.get('/', getWorkspaces);
router.get('/people', getOrgPeople);
router.patch('/people/:userId/role', authorize('owner', 'admin'), updateOrgRole);
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
