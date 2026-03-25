const router = require('express').Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { checkOrgNotLocked } = require('../middleware/orgLimits');
const upload = require('../middleware/upload');
const {
  createComment,
  getComments,
  deleteComment,
  updateComment,
} = require('../controllers/comment.controller');

router.use(auth);

router.post('/:pinId/comments', authorize('owner', 'admin', 'member'), checkOrgNotLocked, upload.array('attachments', 5), createComment);
router.get('/:pinId/comments', getComments);
router.patch('/:pinId/comments/:commentId', authorize('owner', 'admin', 'member'), updateComment);
router.delete('/:pinId/comments/:commentId', authorize('owner', 'admin', 'member'), deleteComment);

module.exports = router;
