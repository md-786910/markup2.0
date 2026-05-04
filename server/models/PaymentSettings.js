const mongoose = require('mongoose');

// Singleton document — one row keyed by `key: 'default'` controls the active
// payment provider for the whole platform. Admins toggle this from the admin
// panel. Credentials remain in env vars; only enable/active state lives here.
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
    });
  }
  return doc;
};

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);
