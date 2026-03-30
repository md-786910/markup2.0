const Comment = require('../models/Comment');
const Pin = require('../models/Pin');
const Project = require('../models/Project');
const asyncHandler = require('../utils/asyncHandler');
const { emitToProject, emailProjectMembers, emailMentionedUsers, notifyIntegrations } = require('../utils/notifier');
const { logActivity } = require('../utils/activityLogger');

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

  // Parse @[Name](userId) mention tokens from body
  const MENTION_REGEX = /@\[([^\]]+)\]\(([a-fA-F\d]+)\)/g;
  const mentionedUserIds = [];
  let mentionMatch;
  while ((mentionMatch = MENTION_REGEX.exec(body)) !== null) {
    mentionedUserIds.push(mentionMatch[2]);
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
    mentions: mentionedUserIds,
  });

  const populated = await Comment.findById(comment._id)
    .populate('author', 'name email')
    .populate('mentions', 'name email');

  // Activity log
  const projectId = pin.project.toString();
  logActivity(projectId, req.user._id, 'comment.created', { pinNumber: pin.pinNumber });

  // Real-time + email notifications
  const io = req.app.get('io');
  emitToProject(io, projectId, 'comment:created', { comment: populated, pinId });

  // Check if this is the first comment on the pin (combined pin+comment notification)
  const priorCommentCount = await Comment.countDocuments({ pin: pinId, _id: { $ne: comment._id } });
  const isFirstComment = priorCommentCount === 0;

  Project.findById(projectId).select('name organization').then((proj) => {
    if (!proj) return;

    // Notify integrations (Slack, Discord, Jira)
    // First comment uses 'pin.created' action for a combined notification
    notifyIntegrations(projectId, proj.organization, {
      action: isFirstComment ? 'pin.created' : 'comment.created',
      actorName: req.user.name,
      projectName: proj.name,
      pinNumber: pin.pinNumber,
      pinId: pin._id.toString(),
      projectId,
      comment: body?.substring(0, 200),
    });

    emailProjectMembers('comment', {
      projectId,
      actorUserId: req.user._id,
      actorName: req.user.name,
      projectName: proj.name,
      pin,
      comment: populated,
      excludeUserIds: mentionedUserIds,
    }).catch(() => {});

    if (mentionedUserIds.length > 0) {
      emailMentionedUsers({
        mentionedUserIds,
        actorUserId: req.user._id,
        actorName: req.user.name,
        projectName: proj.name,
        pin,
        comment: populated,
      }).catch(() => {});
    }
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

  if (comment.author.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized to delete this comment' });
  }

  await Comment.findByIdAndDelete(commentId);

  // Activity log + Real-time notification
  const pin = await Pin.findById(comment.pin);
  if (pin) {
    logActivity(pin.project.toString(), req.user._id, 'comment.deleted', { pinNumber: pin.pinNumber });
  }

  const io = req.app.get('io');
  if (pin) {
    emitToProject(io, pin.project.toString(), 'comment:deleted', {
      commentId,
      pinId: comment.pin.toString(),
    });
  }

  res.json({ message: 'Comment deleted' });
});

exports.updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { body } = req.body;

  if (!body || !body.trim()) {
    return res.status(400).json({ message: 'Comment body is required' });
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({ message: 'Comment not found' });
  }

  // Only the author can edit their own comment
  if (comment.author.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized to edit this comment' });
  }

  // Re-parse mentions from updated body
  const MENTION_REGEX = /@\[([^\]]+)\]\(([a-fA-F\d]+)\)/g;
  const mentionedUserIds = [];
  let match;
  while ((match = MENTION_REGEX.exec(body)) !== null) {
    mentionedUserIds.push(match[2]);
  }

  comment.body = body;
  comment.mentions = mentionedUserIds;
  await comment.save();

  const populated = await Comment.findById(comment._id)
    .populate('author', 'name email')
    .populate('mentions', 'name email');

  // Real-time notification
  const io = req.app.get('io');
  const pin = await Pin.findById(comment.pin);
  if (pin) {
    emitToProject(io, pin.project.toString(), 'comment:updated', {
      comment: populated,
      pinId: comment.pin.toString(),
    });
  }

  res.json({ comment: populated });
});
