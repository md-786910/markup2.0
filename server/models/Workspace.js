const mongoose = require('mongoose');
const { Schema } = mongoose;

// A workspace groups projects inside an organization (e.g. one per client).
// Billing, members and limits stay on the organization. Every org has one
// default workspace; projects without a workspace belong to it.
const workspaceSchema = new Schema({
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Org users with access to every project in this workspace (incl. future
  // ones) at the given level (utils/access.js). Owners/admins manage all anyway.
  members: [{
    _id: false,
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    level: { type: String, enum: ['view', 'comment', 'manage'], default: 'comment' },
  }],
  // One review link for every project in the workspace (same rules as a
  // project share link: password, expiry, comments on/off)
  shareSettings: {
    enabled: { type: Boolean, default: false },
    token: { type: String, unique: true, sparse: true },
    passwordHash: { type: String, default: null },
    allowComments: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
  },
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      if (ret.shareSettings) {
        ret.shareSettings.hasPassword = !!ret.shareSettings.passwordHash;
        delete ret.shareSettings.passwordHash;
      }
      return ret;
    },
  },
});

workspaceSchema.index({ organization: 1, name: 1 });
workspaceSchema.index({ 'members.user': 1 });
// At most one default workspace per organization
workspaceSchema.index({ organization: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

module.exports = mongoose.model('Workspace', workspaceSchema);
