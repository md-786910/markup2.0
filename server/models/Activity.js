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
  // Admin panel user who did it (admin actions); actor stays null then
  adminActor: {
    type: Schema.Types.ObjectId,
    ref: 'AdminUser',
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
      'org.subscription_canceled', 'org.subscription_resumed',
      'org.plan_set_by_admin', 'org.limits_overridden', 'org.trial_extended',
      'org.invoice_refunded',
      'org.data_exported', 'org.deletion_scheduled', 'org.deletion_cancelled',
      'workspace.created', 'workspace.renamed', 'workspace.deleted',
      'workspace.members_updated', 'workspace.share_enabled', 'workspace.share_disabled',
      'integration.connected', 'integration.disconnected',
      'billing.payment_succeeded',
      // Admin team (organization is null)
      'support.resolved',
      'admin.invited', 'admin.disabled', 'admin.enabled', 'admin.removed', 'admin.two_factor_reset',
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
