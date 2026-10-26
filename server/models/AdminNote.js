const mongoose = require('mongoose');
const { Schema } = mongoose;

// Internal notes about a customer organization, written in the admin panel.
// Kept out of the Organization document so they can never reach customers.
const adminNoteSchema = new Schema({
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, maxlength: 4000, trim: true },
  pinned: { type: Boolean, default: false },
}, { timestamps: true });

adminNoteSchema.index({ organization: 1, createdAt: -1 });

module.exports = mongoose.model('AdminNote', adminNoteSchema);
