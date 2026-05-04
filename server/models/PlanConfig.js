const mongoose = require('mongoose');

const planConfigSchema = new mongoose.Schema({
  planId: {
    type: String,
    enum: ['free', 'starter', 'pro', 'enterprise'],
    unique: true,
    required: true,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  limits: {
    maxProjects: { type: Number, default: null },
    maxMembers: { type: Number, default: null },
    maxGuests: { type: Number, default: null },
    hasIntegrations: { type: Boolean, default: null },
    hasActivityLogs: { type: Boolean, default: null },
    hasVersionHistory: { type: Boolean, default: null },
  },
  name: { type: String, default: null },
  price: { type: Number, default: null },
  priceLabel: { type: String, default: null },
  period: { type: String, default: null },
  // undefined = use defaults; explicit [] = override to empty list
  features: { type: [String], default: undefined },
  popular: { type: Boolean, default: null },
  badgeColor: { type: String, default: null },
  order: { type: Number, default: null },
  razorpayPlanId: { type: String, default: null },
  // Free plan only: when true, new signups land on this plan instead of trial
  assignToNewSignups: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('PlanConfig', planConfigSchema);
