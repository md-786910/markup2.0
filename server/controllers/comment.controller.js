const Comment = require('../models/Comment');
const Pin = require('../models/Pin');
const Project = require('../models/Project');
const asyncHandler = require('../utils/asyncHandler');
const { emitToProject, emailProjectMembers } = require('../utils/notifier');

exports.createComment = asyncHandler(async (req, res) => {
  const { pinId } = req.params;
  const { body, parentComment } = req.body;

  if (!body) {
    return res.status(400).json({ message: 'Comment body is required' });
  }

  const pin = await Pin.findById(pinId);
  if (!pin) {
    return res.status(404).json({ message: 'Pin not found' });
  }

  const attachments = (req.files || []).map((file) => ({
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    path: `uploads/${file.filename}`,
  }));

  const comment = await Comment.create({
    pin: pinId,
    author: req.user._id,
    body,
    attachments,
    parentComment: parentComment || null,
  });

  const populated = await Comment.findById(comment._id)
    .populate('author', 'name email');

  // Real-time + email notifications
  const io = req.app.get('io');
  const projectId = pin.project.toString();
  emitToProject(io, projectId, 'comment:created', { comment: populated, pinId });

  Project.findById(projectId).select('name').then((proj) => {
    if (!proj) return;
    emailProjectMembers('comment', {
      projectId,
      actorUserId: req.user._id,
      actorName: req.user.name,
      projectName: proj.name,
      pin,
      comment: populated,
    }).catch(() => {});
  }).catch(() => {});

  res.status(201).json({ comment: populated });
});

exports.getComments = asyncHandler(async (req, res) => {
  const { pinId } = req.params;

  const comments = await Comment.find({ pin: pinId })
    .populate('author', 'name email')
    .sort({ createdAt: 1 });

  res.json({ comments });
});

exports.deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({ message: 'Comment not found' });
  }

  if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized to delete this comment' });
  }

  await Comment.findByIdAndDelete(commentId);

  // Real-time notification
  const io = req.app.get('io');
  const pin = await Pin.findById(comment.pin);
  if (pin) {
    emitToProject(io, pin.project.toString(), 'comment:deleted', {
      commentId,
      pinId: comment.pin.toString(),
    });
  }

  res.json({ message: 'Comment deleted' });
});
