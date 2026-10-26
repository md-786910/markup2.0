const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ['superadmin', 'owner', 'admin', 'member', 'guest'],
    default: 'member',
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null,
  },
  avatar: {
    type: String,
    default: null,
  },
  sessionToken: {
    type: String,
    default: null,
  },
  lastSeen: {
    type: Date,
    default: null,
  },
  lastLoginIp: {
    type: String,
    default: null,
  },
  lastLoginLocation: {
    city: { type: String, default: null },
    region: { type: String, default: null },
    country: { type: String, default: null },
  },
  signupIp: {
    type: String,
    default: null,
  },
  signupLocation: {
    city: { type: String, default: null },
    region: { type: String, default: null },
    country: { type: String, default: null },
  },
  resetPasswordToken: {
    type: String,
    select: false,
  },
  resetPasswordExpires: {
    type: Date,
    select: false,
  },
  // false = unsubscribed from all collaboration notification emails
  emailNotificationsEnabled: {
    type: Boolean,
    default: true,
  },
  mutedProjectEmails: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: [],
  }],
  // Two-step sign-in with an authenticator app (utils/totp.js). Secrets are
  // encrypted (utils/secretBox.js); recovery codes are stored as SHA-256 hashes.
  twoFactor: {
    enabled: { type: Boolean, default: false },
    enabledAt: { type: Date, default: null },
    secret: { type: String, default: null, select: false },
    pendingSecret: { type: String, default: null, select: false },
    pendingCreatedAt: { type: Date, default: null, select: false },
    // Last accepted 30-second step, so a code can't be used twice
    lastUsedStep: { type: Number, default: 0, select: false },
    recoveryCodes: { type: [String], default: [], select: false },
  },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.sessionToken;
  if (obj.twoFactor) obj.twoFactor = { enabled: !!obj.twoFactor.enabled, enabledAt: obj.twoFactor.enabledAt || null };
  return obj;
};

// Member/guest counts and org listings filter by organization
userSchema.index({ organization: 1, role: 1 });

module.exports = mongoose.model('User', userSchema);
