const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/notifications
exports.getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { unreadOnly, limit = 50, page = 1 } = req.query;

  const filter = { recipient: userId };
  if (unreadOnly === 'true') {
    filter.read = false;
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (parsedPage - 1) * parsedLimit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate('actor', 'name email avatar')
      .populate('project', 'name projectType')
      .populate('pin', 'pinNumber pageUrl deviceMode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, read: false }),
  ]);

  res.json({
    notifications,
    unreadCount,
    total,
    page: parsedPage,
    limit: parsedLimit,
  });
});

// GET /api/notifications/unread-count
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const unreadCount = await Notification.countDocuments({ recipient: userId, read: false });
  res.json({ unreadCount });
});

// PATCH /api/notifications/:id/read
exports.markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipient: userId },
    { read: true },
    { new: true }
  )
    .populate('actor', 'name email avatar')
    .populate('project', 'name projectType')
    .populate('pin', 'pinNumber pageUrl deviceMode');

  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  const unreadCount = await Notification.countDocuments({ recipient: userId, read: false });

  res.json({ notification, unreadCount });
});

// PATCH /api/notifications/read-all
exports.markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await Notification.updateMany(
    { recipient: userId, read: false },
    { read: true }
  );

  res.json({ message: 'All notifications marked as read', unreadCount: 0 });
});

// DELETE /api/notifications/:id
exports.deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const result = await Notification.findOneAndDelete({ _id: id, recipient: userId });

  if (!result) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  const unreadCount = await Notification.countDocuments({ recipient: userId, read: false });

  res.json({ message: 'Notification deleted', unreadCount });
});

// DELETE /api/notifications
exports.clearAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await Notification.deleteMany({ recipient: userId });

  res.json({ message: 'All notifications cleared', unreadCount: 0 });
});
