const mongoose = require('mongoose');
const { Schema } = mongoose;

const documentFileSchema = new Schema({
  filename: String,
  originalName: String,
  mimetype: String,
  size: Number,
  path: String,
  pageCount: { type: Number, default: 1 },
  order: { type: Number, default: 0 },
}, { _id: false });

const projectSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
  },
  projectType: {
    type: String,
    enum: ['website', 'document'],
    default: 'website',
  },
  websiteUrl: {
    type: String,
  },
  documents: [documentFileSchema],
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
  },
  projectStatus: {
    type: String,
    enum: ['not_started', 'in_progress', 'in_review', 'approved', 'completed'],
    default: 'not_started',
  },
  shareSettings: {
    enabled: { type: Boolean, default: false },
    token: { type: String, unique: true, sparse: true },
    // Legacy plaintext field. Kept for one release while existing projects
    // are migrated to passwordHash via scripts/hashSharePasswords.js.
    // New writes only set passwordHash; reads prefer passwordHash, fall
    // back to password. Both fields are scrubbed before returning to clients
    // (see sanitizeShareSettings in project.controller.js).
    password: { type: String, default: null },
    passwordHash: { type: String, default: null },
    allowComments: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
  },
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      // Never leak share-link secrets to API consumers. Replace with a
      // boolean flag the UI can use to render a "password protected" badge.
      if (ret.shareSettings) {
        const hasPwd = !!(ret.shareSettings.passwordHash || ret.shareSettings.password);
        delete ret.shareSettings.password;
        delete ret.shareSettings.passwordHash;
        ret.shareSettings.hasPassword = hasPwd;
      }
      return ret;
    },
  },
});

// Conditionally require websiteUrl for website projects
projectSchema.pre('validate', function () {
  if (this.projectType === 'website' && !this.websiteUrl) {
    this.invalidate('websiteUrl', 'Website URL is required for website projects');
  }
  if (this.projectType === 'document' && (!this.documents || this.documents.length === 0)) {
    this.invalidate('documents', 'At least one document is required for document projects');
  }
});

projectSchema.index({ owner: 1 });
projectSchema.index({ members: 1 });
projectSchema.index({ organization: 1 });

module.exports = mongoose.model('Project', projectSchema);
