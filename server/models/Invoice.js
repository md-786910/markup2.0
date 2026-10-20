const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  plan: { type: String, required: true },
  amount: { type: Number, required: true }, // smallest unit (paise for INR, cents for USD)
  currency: { type: String, default: 'INR' },
  // void: superseded by a newer checkout or a plan change; can still be settled if paid late
  // refunded: payment returned (fully or partly, see refundAmount)
  status: { type: String, enum: ['pending', 'paid', 'failed', 'void', 'refunded'], default: 'pending' },
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
  paidAt: { type: Date, default: null },
  // Sequential tax-invoice number (e.g. KOM-2026-000042), assigned when paid
  invoiceNumber: { type: String, default: null },
  // Seller/buyer details and tax split, frozen at payment time for the PDF
  seller: { type: mongoose.Schema.Types.Mixed, default: null },
  buyer: { type: mongoose.Schema.Types.Mixed, default: null },
  tax: { type: mongoose.Schema.Types.Mixed, default: null },
  refundedAt: { type: Date, default: null },
  refundAmount: { type: Number, default: null }, // smallest unit
  // Idempotency flags for the daily cron worker.
  reminders: {
    day0Sent: { type: Boolean, default: false },
    day4Sent: { type: Boolean, default: false },
    day7Sent: { type: Boolean, default: false },
    day9Sent: { type: Boolean, default: false },
    lockSent: { type: Boolean, default: false },
  },
}, { timestamps: true });

invoiceSchema.index({ invoiceNumber: 1 }, { unique: true, partialFilterExpression: { invoiceNumber: { $type: 'string' } } });
// Refund webhooks look invoices up by provider payment id
invoiceSchema.index({ razorpayPaymentId: 1 }, { sparse: true });
invoiceSchema.index({ paypalCaptureId: 1 }, { sparse: true });

// One auto-generated invoice per org per billing month. Partial filter excludes
// existing one-off upgrade invoices that have billingMonth = null.
invoiceSchema.index(
  { organization: 1, billingMonth: 1 },
  { unique: true, partialFilterExpression: { billingMonth: { $type: 'string' } } }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
