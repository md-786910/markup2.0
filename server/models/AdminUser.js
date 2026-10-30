const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// People who run Kommently and sign in to the admin panel. Kept apart from
// customer accounts (User): own sessions, own tokens, never in an organization.
const adminUserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  // Empty until an invited admin sets a password
  passwordHash: { type: String, default: null, select: false },
  // invited: has not set a password yet · active · disabled: can't sign in
  status: { type: String, enum: ['invited', 'active', 'disabled'], default: 'invited' },
  // superadmin: full control · support: tickets, customer notes, up to 14d trial extensions
  role: { type: String, enum: ['superadmin', 'support'], default: 'superadmin' },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  // One session at a time; rotating it signs out every other session
  sessionToken: { type: String, default: null, select: false },
  lastLoginAt: { type: Date, default: null },
  lastLoginIp: { type: String, default: null },
  lastSeen: { type: Date, default: null },
  // Password reset and invitation links (SHA-256 of the emailed token)
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
  // Two-step sign-in, same shape as utils/twoFactor.js expects
  twoFactor: {
    enabled: { type: Boolean, default: false },
    enabledAt: { type: Date, default: null },
    secret: { type: String, default: null, select: false },
    pendingSecret: { type: String, default: null, select: false },
    pendingCreatedAt: { type: Date, default: null, select: false },
    lastUsedStep: { type: Number, default: 0, select: false },
    recoveryCodes: { type: [String], default: [], select: false },
  },
}, { timestamps: true });

adminUserSchema.pre('save', async function () {
  if (!this.isModified('passwordHash') || !this.passwordHash) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

adminUserSchema.methods.comparePassword = async function (candidate) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(String(candidate || ''), this.passwordHash);
};

// What the admin panel may see about an admin
adminUserSchema.methods.toPublic = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    status: this.status,
    role: this.role || 'superadmin',
    lastLoginAt: this.lastLoginAt,
    lastSeen: this.lastSeen,
    twoFactorEnabled: !!this.twoFactor?.enabled,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('AdminUser', adminUserSchema);
