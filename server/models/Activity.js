const mongoose = require('mongoose');
const { Schema } = mongoose;

const activitySchema = new Schema({
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    default: null,
    index: true,
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
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
      // Project-scoped events
      'project.created', 'project.updated', 'project.status_changed',
      'project.archived', 'project.unarchived',
      'pin.created', 'pin.resolved', 'pin.reopened', 'pin.deleted',
      'comment.created', 'comment.deleted',
      'member.invited', 'member.joined', 'member.removed', 'member.role_changed',
      'share.enabled', 'share.disabled',
      'guest.commented', 'guest.pin_created',
      // Org-scoped events
      'org.name_updated', 'org.logo_updated',
      'org.plan_upgraded', 'org.plan_downgraded',
      'org.locked', 'org.unlocked',
      'integration.connected', 'integration.disconnected',
      'billing.payment_succeeded',
    ],
    required: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: false });

activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ organization: 1, createdAt: -1 });

// Auto-set createdAt (no updatedAt needed)
activitySchema.add({ createdAt: { type: Date, default: Date.now } });

module.exports = mongoose.model('Activity', activitySchema);
