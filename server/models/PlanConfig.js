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
    maxWorkspaces: { type: Number, default: null },
    maxMembers: { type: Number, default: null },
    maxGuests: { type: Number, default: null },
    maxStorageMB: { type: Number, default: null },
    hasIntegrations: { type: Boolean, default: null },
    hasActivityLogs: { type: Boolean, default: null },
    hasVersionHistory: { type: Boolean, default: null },
    hasApprovals: { type: Boolean, default: null },
  },
  // Support channel SLA overrides (Phase 6)
  support: {
    tickets: { type: Boolean, default: null },
    chat: { type: Boolean, default: null },
    priority: { type: String, enum: ['normal', 'high', 'urgent', null], default: null },
    replyHours: { type: Number, default: null },
  },
  extraFeatures: [{ type: String }],
  name: { type: String, default: null },
  price: { type: Number, default: null },
  // Monthly price charged through Razorpay, in whole rupees. null = price × RAZORPAY_USD_INR_RATE
  priceInr: { type: Number, default: null },
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
