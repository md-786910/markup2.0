const mongoose = require('mongoose');
const { Schema } = mongoose;

const activitySchema = new Schema({
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
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
  action: {
    type: String,
    enum: [
      'project.created', 'project.updated', 'project.status_changed',
      'pin.created', 'pin.resolved', 'pin.reopened', 'pin.deleted',
      'comment.created', 'comment.deleted',
      'member.invited', 'member.joined', 'member.removed', 'member.role_changed',
      'share.enabled', 'share.disabled',
      'guest.commented', 'guest.pin_created',
    ],
    required: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: false });

activitySchema.index({ project: 1, createdAt: -1 });

// Auto-set createdAt (no updatedAt needed)
activitySchema.add({ createdAt: { type: Date, default: Date.now } });

module.exports = mongoose.model('Activity', activitySchema);
