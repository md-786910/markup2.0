const router = require('express').Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createComment,
  getComments,
  deleteComment,
  updateComment,
} = require('../controllers/comment.controller');

router.use(auth);

router.post('/:pinId/comments', upload.array('attachments', 5), createComment);
router.get('/:pinId/comments', getComments);
router.patch('/:pinId/comments/:commentId', updateComment);
router.delete('/:pinId/comments/:commentId', deleteComment);

module.exports = router;
