const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  plan: { type: String, required: true },
  amount: { type: Number, required: true }, // in cents/paise
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  periodStart: { type: Date },
  periodEnd: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
