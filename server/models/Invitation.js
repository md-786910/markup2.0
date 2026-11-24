const crypto = require('crypto');
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
  // SHA-256 of the emailed signup token (tokenHashed: true). Invitations
  // created before hashing keep the raw token (tokenHashed unset) and are still
  // found by tokenFilter until they are used, resent or expire.
  token: {
    type: String,
    required: true,
    unique: true,
  },
  tokenHashed: {
    type: Boolean,
    default: false,
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
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      // The token is the signup secret: it reaches the invitee only by email.
      // Returning it to the inviter would let them sign up as that address
      // without the email code (signup accepts the token as proof of inbox).
      delete ret.token;
      return ret;
    },
  },
});

invitationSchema.pre('validate', function () {
  if (!this.project && !this.workspace) this.invalidate('project', 'An invitation needs a project or a workspace');
});

function hashInvitationToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

// A new signup token: `raw` goes in the emailed link, the rest is stored
invitationSchema.statics.newToken = function newToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, token: hashInvitationToken(raw), tokenHashed: true };
};

// Query matching the invitation for a raw token from a link: hashed rows by
// hash, legacy rows by the raw value. A stored hash used as a link token
// matches nothing (it is only compared against legacy, unhashed rows).
invitationSchema.statics.tokenFilter = function tokenFilter(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > 256) return { _id: null };
  return {
    $or: [
      { token: hashInvitationToken(raw), tokenHashed: true },
      { token: raw, tokenHashed: { $ne: true } },
    ],
  };
};

invitationSchema.statics.hashToken = hashInvitationToken;

invitationSchema.index({ email: 1, project: 1 });
invitationSchema.index({ email: 1, workspace: 1 });
invitationSchema.index({ organization: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
