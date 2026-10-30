const mongoose = require('mongoose');
const { DEFAULT_TRIAL_DAYS } = require('../config/plans');

// Singleton document — one row keyed by `key: 'default'` controls the active
// payment provider + global billing policy for the whole platform. Admins
// toggle these from the admin panel. Credentials remain in env vars; only
// enable/active state lives here.
const paymentSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  activeProvider: {
    type: String,
    enum: ['razorpay', 'paypal', null],
    default: null,
  },
  providers: {
    razorpay: {
      enabled: { type: Boolean, default: true },
    },
    paypal: {
      enabled: { type: Boolean, default: false },
    },
  },
  // When false, workspace owners cannot move to a lower-tier plan.
  allowDowngrades: { type: Boolean, default: false },
  // Global trial configuration across all workspaces
  trial: {
    defaultDays: { type: Number, default: DEFAULT_TRIAL_DAYS, min: 1, max: 365 },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  },
}, { timestamps: true });

paymentSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: 'default' });
  if (!doc) {
    doc = await this.create({
      key: 'default',
      activeProvider: 'razorpay',
      providers: {
        razorpay: { enabled: true },
        paypal: { enabled: false },
      },
      trial: {
        defaultDays: DEFAULT_TRIAL_DAYS,
        updatedAt: new Date(),
      },
    });
  } else if (!doc.trial || !doc.trial.defaultDays) {
    doc.trial = {
      defaultDays: DEFAULT_TRIAL_DAYS,
      updatedAt: new Date(),
    };
    await doc.save();
  }
  return doc;
};

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);
