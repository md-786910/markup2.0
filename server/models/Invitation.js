const mongoose = require('mongoose');
const { Schema } = mongoose;

const invitationSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted'],
    default: 'pending',
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
}, { timestamps: true });

invitationSchema.index({ email: 1, project: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
