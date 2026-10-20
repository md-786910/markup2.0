const router = require('express').Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { checkOrgNotLocked } = require('../middleware/orgLimits');
const uploadDocument = require('../middleware/uploadDocument');
const { enforceStorageQuota } = require('../utils/storage');
const {
  createComment,
  getComments,
  deleteComment,
  updateComment,
} = require('../controllers/comment.controller');

const { pinAccess } = require('../middleware/projectAccess');

router.use(auth);

router.post('/:pinId/comments', authorize('owner', 'admin', 'member'), pinAccess, checkOrgNotLocked, uploadDocument.array('attachments', 5), enforceStorageQuota, createComment);
router.get('/:pinId/comments', pinAccess, getComments);
router.patch('/:pinId/comments/:commentId', authorize('owner', 'admin', 'member'), pinAccess, checkOrgNotLocked, updateComment);
router.delete('/:pinId/comments/:commentId', authorize('owner', 'admin', 'member'), pinAccess, checkOrgNotLocked, deleteComment);

module.exports = router;
