const mongoose = require('mongoose');
const { Schema } = mongoose;

const integrationSchema = new Schema({
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    default: null, // null = org-wide
  },
  type: {
    type: String,
    enum: ['slack', 'jira', 'discord'],
    required: true,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  config: {
    type: Schema.Types.Mixed,
    default: {},
    // Slack: { webhookUrl, notifyOn: ['pin.created', 'comment.created', 'pin.resolved'] }
    // Discord: { webhookUrl, notifyOn: [...] }
    // Jira: { domain, email, apiToken, projectKey, issueType, syncPins: true }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

integrationSchema.index({ organization: 1, type: 1 });

module.exports = mongoose.model('Integration', integrationSchema);
