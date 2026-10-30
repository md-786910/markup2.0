const mongoose = require('mongoose');
const { Schema } = mongoose;

const approvalSchema = new Schema({
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  version: {
    type: Schema.Types.ObjectId,
    ref: 'Version',
    default: null,
  },
  decision: {
    type: String,
    enum: ['approved', 'changes_requested'],
    required: true,
  },
  note: {
    type: String,
    maxlength: 2000,
    default: '',
  },
  reviewer: {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    guestName: {
      type: String,
      default: null,
    },
    guestEmail: {
      type: String,
      default: null,
    },
  },
  openPinsAtDecision: {
    type: Number,
    required: true,
    default: 0,
  },
  ip: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
}, { timestamps: true });

approvalSchema.index({ project: 1, createdAt: -1 });
approvalSchema.index({ project: 1, version: 1, 'reviewer.guestEmail': 1 });

module.exports = mongoose.model('Approval', approvalSchema);

