const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  logo: {
    type: String,
    default: null,
  },
  plan: {
    type: String,
    enum: ['trial', 'free', 'starter', 'pro', 'enterprise'],
    default: 'trial',
  },
  limits: {
    maxMembers: { type: Number, default: 10 },
    maxGuests: { type: Number, default: 5 },
    maxProjects: { type: Number, default: 5 },
  },
  trialEndsAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  lockedAt: {
    type: Date,
    default: null,
  },
  lockedReason: {
    type: String,
    default: null,
  },
  subscription: {
    status: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'none'],
      default: 'none',
    },
    currentPeriodEnd: { type: Date, default: null },
    externalId: { type: String, default: null },
  },
}, { timestamps: true });

// Auto-generate slug from name before save
organizationSchema.pre('save', function () {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)
      + '-' + Math.random().toString(36).slice(2, 8);
  }
});

organizationSchema.index({ slug: 1 });
organizationSchema.index({ owner: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
