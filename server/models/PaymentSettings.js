const mongoose = require('mongoose');

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
    // 30 days: what the website, pricing page and Terms promise
    defaultDays: { type: Number, default: 30, min: 1, max: 365 },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  },
}, { timestamps: true });

const DEFAULT_TRIAL_DAYS = 30;

paymentSettingsSchema.statics.getSingleton = async function () {
  // One atomic upsert: two first requests at once (e.g. /api/plans on a fresh
  // database) must not both try to create it
  const insert = {
    key: 'default',
    activeProvider: 'razorpay',
    providers: { razorpay: { enabled: true }, paypal: { enabled: false } },
    trial: { defaultDays: DEFAULT_TRIAL_DAYS, updatedAt: new Date(), updatedBy: null },
  };
  let doc;
  try {
    doc = await this.findOneAndUpdate({ key: 'default' }, { $setOnInsert: insert }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: false });
  } catch (err) {
    if (err.code !== 11000) throw err;
    doc = await this.findOne({ key: 'default' });
  }
  // A missing length, or the old automatic 14 that no admin ever chose, becomes 30
  if (!doc.trial || !doc.trial.defaultDays || (doc.trial.defaultDays === 14 && !doc.trial.updatedBy)) {
    doc.trial = { defaultDays: DEFAULT_TRIAL_DAYS, updatedAt: new Date(), updatedBy: null };
    await doc.save();
  }
  return doc;
};

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);
