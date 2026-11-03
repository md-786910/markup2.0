const mongoose = require('mongoose');

// Notification-email opt-outs for addresses without a Kommently account (guest
// reviewers who unsubscribed); account holders use User.emailNotificationsEnabled
const emailOptOutSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('EmailOptOut', emailOptOutSchema);
