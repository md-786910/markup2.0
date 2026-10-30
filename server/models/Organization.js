const mongoose = require('mongoose');
const { DEFAULT_TRIAL_DAYS } = require('../config/plans');

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
    maxWorkspaces: { type: Number },
    hasIntegrations: { type: Boolean, default: false },
    hasActivityLogs: { type: Boolean, default: false },
    hasVersionHistory: { type: Boolean, default: false },
    hasApprovals: { type: Boolean, default: false },
    hasTaskWorkflow: { type: Boolean, default: false },
  },
  trialDays: {
    type: Number,
    default: DEFAULT_TRIAL_DAYS,
  },
  trialEndsAt: {
    type: Date,
    default: () => new Date(Date.now() + DEFAULT_TRIAL_DAYS * 24 * 60 * 60 * 1000),
  },
  // Trial reminder emails already sent by the billing cron (idempotency flags)
  trialReminders: {
    day7Sent: { type: Boolean, default: false },
    day3Sent: { type: Boolean, default: false },
    day1Sent: { type: Boolean, default: false },
    expiredSent: { type: Boolean, default: false },
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
      enum: ['active', 'past_due', 'canceled', 'none', 'halted'],
      default: 'none',
    },
    currentPeriodEnd: { type: Date, default: null },
    externalId: { type: String, default: null }, // Could be razorpaySubscriptionId
    provider: {
      type: String,
      enum: ['razorpay', 'paypal', null],
      default: null,
    },
    razorpayCustomerId: { type: String, default: null },
    razorpayPlanId: { type: String, default: null },
    razorpaySubscriptionId: { type: String, default: null },
    paypalSubscriptionId: { type: String, default: null },
    // Owner cancelled: keeps the paid plan until currentPeriodEnd, then moves to free
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  // Custom pricing and terms set by a superadmin (Phase 6)
  deal: {
    price: { type: Number, default: null }, // In whole currency units (e.g. 150 for $150/mo)
    currency: { type: String, enum: ['USD', 'INR'], default: 'USD' },
    note: { type: String, default: null },
    until: { type: Date, default: null }, // Expiry date (null = indefinite)
  },
  // Per-org limits set by a superadmin (enterprise deals). Merged over the plan's
  // limits on every request; unset keys use the plan default.
  limitOverrides: {
    maxProjects: { type: Number },
    maxWorkspaces: { type: Number },
    maxMembers: { type: Number },
    maxGuests: { type: Number },
    maxStorageMB: { type: Number },
    hasIntegrations: { type: Boolean },
    hasActivityLogs: { type: Boolean },
    hasVersionHistory: { type: Boolean },
    hasApprovals: { type: Boolean },
    // Support channels (config/plans.js getSupportForOrg); unset keys use the plan's
    supportTickets: { type: Boolean },
    supportChat: { type: Boolean },
    supportPriority: { type: String, enum: ['normal', 'high', 'urgent'] },
    supportReplyHours: { type: Number },
  },
  // Owner requested deletion: the org is locked and purged by the daily job at this time
  deletionScheduledAt: { type: Date, default: null },
  // Bytes of uploaded files counted against the plan's maxStorageMB (utils/storage.js)
  storageUsedBytes: { type: Number, default: 0 },
  // Buyer details printed on tax invoices (editable by the owner)
  billingDetails: {
    legalName: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' }, // Indian state, decides CGST+SGST vs IGST
    taxId: { type: String, trim: true, default: '' }, // GSTIN / VAT number
  },
  // Customer Health Score (Phase 5)
  health: {
    score: { type: Number, min: 0, max: 100, default: 50 },
    band: { type: String, enum: ['healthy', 'watch', 'at_risk'], default: 'watch', index: true },
    reasons: [{ type: String }],
    computedAt: { type: Date, default: null },
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

organizationSchema.index({ owner: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
