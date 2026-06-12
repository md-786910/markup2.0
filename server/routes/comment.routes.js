const router = require('express').Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { checkOrgNotLocked } = require('../middleware/orgLimits');
const uploadDocument = require('../middleware/uploadDocument');
const {
  createComment,
  getComments,
  deleteComment,
  updateComment,
} = require('../controllers/comment.controller');

router.use(auth);

router.post('/:pinId/comments', authorize('owner', 'admin', 'member'), checkOrgNotLocked, uploadDocument.array('attachments', 5), createComment);
router.get('/:pinId/comments', getComments);
router.patch('/:pinId/comments/:commentId', authorize('owner', 'admin', 'member'), checkOrgNotLocked, updateComment);
router.delete('/:pinId/comments/:commentId', authorize('owner', 'admin', 'member'), checkOrgNotLocked, deleteComment);

module.exports = router;
