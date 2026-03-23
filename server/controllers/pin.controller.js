const Pin = require('../models/Pin');
const Comment = require('../models/Comment');
const asyncHandler = require('../utils/asyncHandler');
const { emitToProject } = require('../utils/notifier');

exports.createPin = asyncHandler(async (req, res) => {
  const { xPercent, yPercent, pageUrl, selector, elementOffsetX, elementOffsetY, documentWidth, documentHeight } = req.body;
  const { projectId } = req.params;

  if (xPercent == null || yPercent == null || !pageUrl) {
    return res.status(400).json({ message: 'xPercent, yPercent, and pageUrl are required' });
  }

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
    selector: selector || null,
    elementOffsetX: elementOffsetX != null ? elementOffsetX : null,
    elementOffsetY: elementOffsetY != null ? elementOffsetY : null,
    documentWidth: documentWidth != null ? documentWidth : null,
    documentHeight: documentHeight != null ? documentHeight : null,
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
  const { pageUrl } = req.query;

  const filter = { project: projectId };
  if (pageUrl) {
    filter.pageUrl = pageUrl;
  }

  const pins = await Pin.find(filter)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  // Get comment counts and latest comment for each pin
  const pinIds = pins.map((p) => p._id);
  const commentAgg = await Comment.aggregate([
    { $match: { pin: { $in: pinIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$pin',
        count: { $sum: 1 },
        latestBody: { $first: '$body' },
        latestAuthor: { $first: '$author' },
        latestCreatedAt: { $first: '$createdAt' },
      },
    },
  ]);

  // Populate latest comment authors
  const authorIds = commentAgg.map((c) => c.latestAuthor).filter(Boolean);
  const authors = await require('../models/User').find(
    { _id: { $in: authorIds } },
    'name email'
  );
  const authorMap = {};
  authors.forEach((a) => { authorMap[a._id.toString()] = a; });

  const commentMap = {};
  commentAgg.forEach((c) => {
    commentMap[c._id.toString()] = {
      count: c.count,
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
