const router = require('express').Router();
const auth = require('../middleware/auth');
const { checkOrgNotLocked } = require('../middleware/orgLimits');
const uploadDocument = require('../middleware/uploadDocument');
const { enforceStorageQuota } = require('../utils/storage');
const {
  createComment,
  getComments,
  deleteComment,
  updateComment,
} = require('../controllers/comment.controller');

const { pinAccess, requireAccess } = require('../middleware/projectAccess');

router.use(auth);

router.post('/:pinId/comments', pinAccess, requireAccess('comment'), checkOrgNotLocked, uploadDocument.array('attachments', 5), enforceStorageQuota, createComment);
router.get('/:pinId/comments', pinAccess, getComments);
router.patch('/:pinId/comments/:commentId', pinAccess, requireAccess('comment'), checkOrgNotLocked, updateComment);
router.delete('/:pinId/comments/:commentId', pinAccess, requireAccess('comment'), checkOrgNotLocked, deleteComment);

module.exports = router;
