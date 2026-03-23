const Pin = require('../models/Pin');
const Comment = require('../models/Comment');
const asyncHandler = require('../utils/asyncHandler');
const { emitToProject } = require('../utils/notifier');

exports.createPin = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // When using multer (multipart/form-data), all body fields are strings
  const pageUrl = req.body.pageUrl;
  const xPercent = req.body.xPercent != null ? parseFloat(req.body.xPercent) : null;
  const yPercent = req.body.yPercent != null ? parseFloat(req.body.yPercent) : null;
  const selector = req.body.selector || null;
  const elementOffsetX = req.body.elementOffsetX != null ? parseFloat(req.body.elementOffsetX) : null;
  const elementOffsetY = req.body.elementOffsetY != null ? parseFloat(req.body.elementOffsetY) : null;
  const documentWidth = req.body.documentWidth != null ? parseFloat(req.body.documentWidth) : null;
  const documentHeight = req.body.documentHeight != null ? parseFloat(req.body.documentHeight) : null;
  const deviceMode = req.body.deviceMode || 'desktop';
  const viewportXPercent = req.body.viewportXPercent != null ? parseFloat(req.body.viewportXPercent) : null;
  const viewportYPercent = req.body.viewportYPercent != null ? parseFloat(req.body.viewportYPercent) : null;

  if (xPercent == null || isNaN(xPercent) || yPercent == null || isNaN(yPercent) || !pageUrl) {
    return res.status(400).json({ message: 'xPercent, yPercent, and pageUrl are required' });
  }

  // Screenshot file uploaded via multer
  const screenshot = req.file ? {
    filename: req.file.filename,
    path: `uploads/${req.file.filename}`,
  } : null;

  // Get next incremental pin number for this project
  const lastPin = await Pin.findOne({ project: projectId })
    .sort({ pinNumber: -1 })
    .select('pinNumber')
    .lean();
  const pinNumber = (lastPin?.pinNumber || 0) + 1;

  const pin = await Pin.create({
    project: projectId,
    pageUrl,
    createdBy: req.user._id,
    xPercent,
    yPercent,
    selector,
    elementOffsetX,
    elementOffsetY,
    documentWidth,
    documentHeight,
    deviceMode,
    viewportXPercent,
    viewportYPercent,
    screenshot,
    pinNumber,
  });

  const populated = await Pin.findById(pin._id).populate('createdBy', 'name email');

  // Real-time notification (email is sent when the first comment is created)
  const io = req.app.get('io');
  emitToProject(io, projectId, 'pin:created', { pin: populated });

  res.status(201).json({ pin: populated });
});

exports.getPins = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { pageUrl, deviceMode } = req.query;

  const filter = { project: projectId };
  if (pageUrl) {
    filter.pageUrl = pageUrl;
  }
  if (deviceMode) {
    filter.deviceMode = deviceMode;
  }

  const pins = await Pin.find(filter)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  // Get comment counts, first comment, and latest comment for each pin
  const pinIds = pins.map((p) => p._id);
  const commentAgg = await Comment.aggregate([
    { $match: { pin: { $in: pinIds } } },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: '$pin',
        count: { $sum: 1 },
        firstBody: { $first: '$body' },
        firstAuthor: { $first: '$author' },
        firstCreatedAt: { $first: '$createdAt' },
        latestBody: { $last: '$body' },
        latestAuthor: { $last: '$author' },
        latestCreatedAt: { $last: '$createdAt' },
      },
    },
  ]);

  // Populate comment authors (both first and latest)
  const authorIds = [
    ...commentAgg.map((c) => c.firstAuthor),
    ...commentAgg.map((c) => c.latestAuthor),
  ].filter(Boolean);
  const authors = await require('../models/User').find(
    { _id: { $in: [...new Set(authorIds.map((id) => id.toString()))] } },
    'name email'
  );
  const authorMap = {};
  authors.forEach((a) => { authorMap[a._id.toString()] = a; });

  const commentMap = {};
  commentAgg.forEach((c) => {
    commentMap[c._id.toString()] = {
      count: c.count,
      firstComment: c.firstBody ? {
        body: c.firstBody,
        author: authorMap[c.firstAuthor?.toString()] || null,
        createdAt: c.firstCreatedAt,
      } : null,
      latestComment: c.latestBody ? {
        body: c.latestBody,
        author: authorMap[c.latestAuthor?.toString()] || null,
        createdAt: c.latestCreatedAt,
      } : null,
    };
  });

  const pinsWithCounts = pins.map((pin) => {
    const info = commentMap[pin._id.toString()] || {};
    return {
      ...pin.toObject(),
      commentsCount: info.count || 0,
      firstComment: info.firstComment || null,
      latestComment: info.latestComment || null,
    };
  });

  res.json({ pins: pinsWithCounts });
});

exports.updatePin = asyncHandler(async (req, res) => {
  const { pinId } = req.params;
  const { status } = req.body;

  const pin = await Pin.findById(pinId);
  if (!pin) {
    return res.status(404).json({ message: 'Pin not found' });
  }

  if (status) pin.status = status;
  await pin.save();

  const populated = await Pin.findById(pin._id).populate('createdBy', 'name email');

  // Real-time notification
  const io = req.app.get('io');
  emitToProject(io, pin.project.toString(), 'pin:updated', { pin: populated });

  res.json({ pin: populated });
});

exports.attachScreenshot = asyncHandler(async (req, res) => {
  const { pinId } = req.params;
  if (!req.file) {
    return res.status(400).json({ message: 'No screenshot file' });
  }

  const pin = await Pin.findById(pinId);
  if (!pin) {
    return res.status(404).json({ message: 'Pin not found' });
  }

  pin.screenshot = {
    filename: req.file.filename,
    path: `uploads/${req.file.filename}`,
  };
  await pin.save();

  const populated = await Pin.findById(pin._id).populate('createdBy', 'name email');
  res.json({ pin: populated });
});

exports.deletePin = asyncHandler(async (req, res) => {
  const { pinId } = req.params;

  const pin = await Pin.findById(pinId);
  if (!pin) {
    return res.status(404).json({ message: 'Pin not found' });
  }

  const projectId = pin.project.toString();

  await Comment.deleteMany({ pin: pinId });
  await Pin.findByIdAndDelete(pinId);

  // Real-time notification
  const io = req.app.get('io');
  emitToProject(io, projectId, 'pin:deleted', { pinId });

  res.json({ message: 'Pin deleted' });
});
