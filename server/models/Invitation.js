const mongoose = require('mongoose');
const { Schema } = mongoose;

const invitationSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  // An invitation is to one project, or to a whole workspace
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
  },
  workspace: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    default: null,
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'member', 'guest'],
    default: 'member',
  },
  // Access level on the invited project/workspace (utils/access.js)
  level: {
    type: String,
    enum: ['view', 'comment', 'manage'],
    default: null,
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
    default: () => new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  },
}, { timestamps: true });

invitationSchema.pre('validate', function () {
  if (!this.project && !this.workspace) this.invalidate('project', 'An invitation needs a project or a workspace');
});

invitationSchema.index({ email: 1, project: 1 });
invitationSchema.index({ email: 1, workspace: 1 });
invitationSchema.index({ organization: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
