const SiteNotice = require('../models/SiteNotice');
const asyncHandler = require('../utils/asyncHandler');
const { logAdminAction } = require('../utils/activityLogger');

/**
 * Public endpoint to fetch active notice banner for client and guest app.
 * GET /api/site-notice
 */
exports.getPublicNotice = asyncHandler(async (req, res) => {
  const notice = await SiteNotice.findOne({ key: 'global' }).lean();
  if (!notice || !notice.enabled || !notice.message) {
    return res.json({ notice: null });
  }

  const now = new Date();
  if (notice.startsAt && new Date(notice.startsAt) > now) {
    return res.json({ notice: null });
  }
  if (notice.expiresAt && new Date(notice.expiresAt) < now) {
    return res.json({ notice: null });
  }

  res.json({
    notice: {
      message: notice.message,
      level: notice.level || 'info',
      dismissible: notice.dismissible !== false,
      link: notice.link || null,
      linkText: notice.linkText || null,
      updatedAt: notice.updatedAt,
    },
  });
});

/**
 * Superadmin endpoint to read full notice settings.
 * GET /api/admin/site-notice
 */
exports.getAdminNotice = asyncHandler(async (req, res) => {
  let notice = await SiteNotice.findOne({ key: 'global' });
  if (!notice) {
    notice = await SiteNotice.create({ key: 'global' });
  }
  res.json({ notice });
});

/**
 * Superadmin endpoint to update notice settings.
 * PATCH /api/admin/site-notice
 */
exports.updateAdminNotice = asyncHandler(async (req, res) => {
  const { enabled, message, level, dismissible, link, linkText, startsAt, expiresAt } = req.body || {};

  const VALID_LEVELS = ['info', 'warning', 'critical'];
  const update = {
    updatedBy: req.admin._id,
  };

  if (enabled != null) update.enabled = !!enabled;
  if (message != null) update.message = String(message).slice(0, 500).trim();
  if (level && VALID_LEVELS.includes(level)) update.level = level;
  if (dismissible != null) update.dismissible = !!dismissible;
  if (link !== undefined) update.link = link ? String(link).slice(0, 300).trim() : null;
  if (linkText !== undefined) update.linkText = linkText ? String(linkText).slice(0, 60).trim() : null;
  if (startsAt !== undefined) update.startsAt = startsAt ? new Date(startsAt) : null;
  if (expiresAt !== undefined) update.expiresAt = expiresAt ? new Date(expiresAt) : null;

  const notice = await SiteNotice.findOneAndUpdate(
    { key: 'global' },
    { $set: update },
    { returnDocument: 'after', upsert: true }
  );

  logAdminAction(null, req.admin, 'admin.site_notice_updated', {
    enabled: notice.enabled,
    level: notice.level,
    message: notice.message?.slice(0, 80),
  });

  res.json({ notice });
});

