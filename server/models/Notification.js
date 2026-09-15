const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  actor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  actorGuest: {
    name: { type: String, default: null },
    email: { type: String, default: null },
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },
  pin: {
    type: Schema.Types.ObjectId,
    ref: 'Pin',
    default: null,
    index: true,
  },
  comment: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
  },
  type: {
    type: String,
    enum: [
      'comment',
      'mention',
      'pin_created',
      'pin_resolved',
      'pin_reopened',
      'pin_deleted',
      'member_invited',
      'member_removed',
    ],
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
