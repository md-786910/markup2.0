const mongoose = require('mongoose');

// Global site-wide notice or maintenance banner controlled by superadmins.
const siteNoticeSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  enabled: { type: Boolean, default: false },
  message: { type: String, default: '', maxlength: 500 },
  level: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
  dismissible: { type: Boolean, default: true },
  link: { type: String, default: null, maxlength: 300 },
  linkText: { type: String, default: null, maxlength: 60 },
  startsAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
}, { timestamps: true });

siteNoticeSchema.methods.isActive = function () {
  if (!this.enabled || !this.message) return false;
  const now = new Date();
  if (this.startsAt && new Date(this.startsAt) > now) return false;
  if (this.expiresAt && new Date(this.expiresAt) < now) return false;
  return true;
};

module.exports = mongoose.model('SiteNotice', siteNoticeSchema);

