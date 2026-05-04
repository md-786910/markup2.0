const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  plan: { type: String, required: true },
  amount: { type: Number, required: true }, // smallest unit (paise for INR, cents for USD)
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  provider: {
    type: String,
    enum: ['razorpay', 'paypal'],
    default: 'razorpay',
    index: true,
  },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  paypalOrderId: { type: String, index: true, sparse: true },
  paypalCaptureId: { type: String },
  periodStart: { type: Date },
  periodEnd: { type: Date },
  // Monthly auto-billing — only set on auto-generated cycle invoices.
  billingMonth: { type: String, default: null, index: true }, // YYYY-MM
  dueAt: { type: Date, default: null },                       // = createdAt + 10 days
  // Idempotency flags for the daily cron worker.
  reminders: {
    day0Sent: { type: Boolean, default: false },
    day4Sent: { type: Boolean, default: false },
    day7Sent: { type: Boolean, default: false },
    day9Sent: { type: Boolean, default: false },
    lockSent: { type: Boolean, default: false },
  },
}, { timestamps: true });

// One auto-generated invoice per org per billing month. Partial filter excludes
// existing one-off upgrade invoices that have billingMonth = null.
invoiceSchema.index(
  { organization: 1, billingMonth: 1 },
  { unique: true, partialFilterExpression: { billingMonth: { $type: 'string' } } }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
