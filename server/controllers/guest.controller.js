const Project = require('../models/Project');
const Pin = require('../models/Pin');
const Comment = require('../models/Comment');
const asyncHandler = require('../utils/asyncHandler');
const { logGuestActivity } = require('../utils/activityLogger');

/**
 * GET /api/guest/:shareToken
 * Public endpoint — returns project data for guest review.
 */
exports.getGuestProject = asyncHandler(async (req, res) => {
  const { shareToken } = req.params;
  const { password } = req.query;

  const project = await Project.findOne({
    'shareSettings.token': shareToken,
    'shareSettings.enabled': true,
  }).select('name projectType websiteUrl documents shareSettings projectStatus');

  if (!project) {
    return res.status(404).json({ message: 'Review link not found or has been disabled.' });
  }

  // Check expiry
  if (project.shareSettings.expiresAt && new Date(project.shareSettings.expiresAt) < new Date()) {
    return res.status(410).json({ message: 'This review link has expired.' });
  }

  // Check password
  if (project.shareSettings.password) {
    if (!password || password !== project.shareSettings.password) {
      return res.status(401).json({
        message: 'This review requires a password.',
        requiresPassword: true,
      });
    }
  }

  // Return limited project data
  res.json({
    project: {
      _id: project._id,
      name: project.name,
      projectType: project.projectType,
      websiteUrl: project.websiteUrl,
      documents: project.documents,
      projectStatus: project.projectStatus,
      allowComments: project.shareSettings.allowComments,
    },
  });
});

/**
 * GET /api/guest/:shareToken/pins
 * Public endpoint — returns pins for guest review.
 */
exports.getGuestPins = asyncHandler(async (req, res) => {
  const { shareToken } = req.params;
  const { pageUrl, deviceMode } = req.query;

  const project = await Project.findOne({
    'shareSettings.token': shareToken,
    'shareSettings.enabled': true,
  });

  if (!project) {
    return res.status(404).json({ message: 'Review link not found.' });
  }

  const filter = { project: project._id };
  if (pageUrl) filter.pageUrl = pageUrl;
  if (deviceMode) filter.deviceMode = deviceMode;

  const pins = await Pin.find(filter)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  // Get comment counts
  const pinIds = pins.map((p) => p._id);
  const commentAgg = await Comment.aggregate([
    { $match: { pin: { $in: pinIds } } },
    { $group: { _id: '$pin', count: { $sum: 1 } } },
  ]);
  const countMap = {};
  commentAgg.forEach((c) => { countMap[c._id.toString()] = c.count; });

  const pinsWithCounts = pins.map((pin) => ({
    ...pin.toObject(),
    commentsCount: countMap[pin._id.toString()] || 0,
  }));

  res.json({ pins: pinsWithCounts });
});

/**
 * GET /api/guest/:shareToken/pins/:pinId/comments
 * Public endpoint — returns comments for a pin.
 */
exports.getGuestComments = asyncHandler(async (req, res) => {
  const { shareToken, pinId } = req.params;

  const project = await Project.findOne({
    'shareSettings.token': shareToken,
    'shareSettings.enabled': true,
  });

  if (!project) {
    return res.status(404).json({ message: 'Review link not found.' });
  }

  const comments = await Comment.find({ pin: pinId })
    .populate('author', 'name email')
    .sort({ createdAt: 1 });

  res.json({ comments });
});

/**
 * POST /api/guest/:shareToken/pins
 * Public endpoint — create pin as guest.
 */
exports.createGuestPin = asyncHandler(async (req, res) => {
  const { shareToken } = req.params;

  const project = await Project.findOne({
    'shareSettings.token': shareToken,
    'shareSettings.enabled': true,
  });

  if (!project) {
    return res.status(404).json({ message: 'Review link not found.' });
  }

  if (!project.shareSettings.allowComments) {
    return res.status(403).json({ message: 'Guest commenting is disabled for this project.' });
  }

  const {
    guestName, guestEmail, pageUrl, xPercent, yPercent,
    selector, elementOffsetX, elementOffsetY,
    documentWidth, documentHeight, deviceMode,
    viewportXPercent, viewportYPercent,
  } = req.body;

  if (!guestName || !guestEmail) {
    return res.status(400).json({ message: 'Guest name and email are required.' });
  }

  if (xPercent == null || yPercent == null || !pageUrl) {
    return res.status(400).json({ message: 'xPercent, yPercent, and pageUrl are required.' });
  }

  // Get next pin number
  const lastPin = await Pin.findOne({ project: project._id })
    .sort({ pinNumber: -1 })
    .select('pinNumber')
    .lean();
  const pinNumber = (lastPin?.pinNumber || 0) + 1;

  const pin = await Pin.create({
    project: project._id,
    pageUrl,
    createdBy: null,
    createdByGuest: { name: guestName, email: guestEmail },
    xPercent: parseFloat(xPercent),
    yPercent: parseFloat(yPercent),
    selector: selector || null,
    elementOffsetX: elementOffsetX != null ? parseFloat(elementOffsetX) : null,
    elementOffsetY: elementOffsetY != null ? parseFloat(elementOffsetY) : null,
    documentWidth: documentWidth != null ? parseFloat(documentWidth) : null,
    documentHeight: documentHeight != null ? parseFloat(documentHeight) : null,
    deviceMode: deviceMode || 'desktop',
    viewportXPercent: viewportXPercent != null ? parseFloat(viewportXPercent) : null,
    viewportYPercent: viewportYPercent != null ? parseFloat(viewportYPercent) : null,
    pinNumber,
  });

  // Activity log
  logGuestActivity(project._id, guestName, guestEmail, 'guest.pin_created', { pinNumber });

  // Emit real-time event
  const io = req.app.get('io');
  if (io) {
    io.to(`project:${project._id}`).emit('pin:created', { pin });
  }

  res.status(201).json({ pin });
});

/**
 * POST /api/guest/:shareToken/pins/:pinId/comments
 * Public endpoint — create comment as guest.
 */
exports.createGuestComment = asyncHandler(async (req, res) => {
  const { shareToken, pinId } = req.params;

  const project = await Project.findOne({
    'shareSettings.token': shareToken,
    'shareSettings.enabled': true,
  });

  if (!project) {
    return res.status(404).json({ message: 'Review link not found.' });
  }

  if (!project.shareSettings.allowComments) {
    return res.status(403).json({ message: 'Guest commenting is disabled for this project.' });
  }

  const { guestName, guestEmail, body } = req.body;

  if (!guestName || !guestEmail) {
    return res.status(400).json({ message: 'Guest name and email are required.' });
  }

  if (!body) {
    return res.status(400).json({ message: 'Comment body is required.' });
  }

  const pin = await Pin.findById(pinId);
  if (!pin || pin.project.toString() !== project._id.toString()) {
    return res.status(404).json({ message: 'Pin not found.' });
  }

  const comment = await Comment.create({
    pin: pinId,
    author: null,
    authorGuest: { name: guestName, email: guestEmail },
    body,
  });

  // Activity log
  logGuestActivity(project._id, guestName, guestEmail, 'guest.commented', { pinNumber: pin.pinNumber });

  // Real-time event
  const io = req.app.get('io');
  if (io) {
    io.to(`project:${project._id}`).emit('comment:created', { comment, pinId });
  }

  res.status(201).json({ comment });
});
