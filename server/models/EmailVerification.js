const mongoose = require('mongoose');
const crypto = require('crypto');

const TTL_MS = 10 * 60 * 1000; // 10 minutes

const emailVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  // SHA-256 hash of the OTP — never store the raw code
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  // Throttling
  lastSentAt: { type: Date, default: null },
  resendCount: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  // Set to true once an OTP has been successfully verified for this email
  // within the past TTL window. Signup checks this flag.
  verifiedAt: { type: Date, default: null },
}, { timestamps: true });

// TTL index: drop docs an hour after expiry so the collection stays clean.
// 1h after expiresAt covers the verifiedAt-still-valid window for signup.
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

emailVerificationSchema.statics.hashOtp = function (otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
};

emailVerificationSchema.statics.makeOtp = function () {
  // 6-digit numeric, zero-padded
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
};

emailVerificationSchema.statics.TTL_MS = TTL_MS;

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);
