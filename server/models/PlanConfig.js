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
  },
}, { timestamps: true });

module.exports = mongoose.model('PlanConfig', planConfigSchema);
