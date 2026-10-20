const crypto = require('crypto');
const { settleInvoice } = require('./settleInvoice');
const Invoice = require('../models/Invoice');
const { PaymentVerificationError } = require('./errors');
const { applyRefund } = require('./refundInvoice');

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

// Tell the org owner a payment attempt failed (fire-and-forget).
async function notifyPaymentFailed(invoice) {
  try {
    const Organization = require('../models/Organization');
    const User = require('../models/User');
    const org = await Organization.findById(invoice.organization).select('name');
    const owner = await User.findOne({ organization: invoice.organization, role: 'owner' }).select('email');
    if (!org || !owner?.email) return;
    await require('../utils/mailer').sendPaymentFailedEmail(
      owner.email, org.name, invoice.amount, invoice.currency, `${CLIENT_ORIGIN}/settings?tab=billing`,
    );
  } catch (err) {
    console.error(`[billing] payment-failed email for invoice ${invoice._id} failed: ${err.message}`);
  }
}

const ID = 'razorpay';
let razorpayClient;

function isConfigured() {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function getRazorpayClient() {
  if (!isConfigured()) throw new Error('Razorpay is not configured.');
  if (razorpayClient) return razorpayClient;
  const Razorpay = require('razorpay');
  razorpayClient = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return razorpayClient;
}

/**
 * Create a Razorpay one-month order.
 * @param {Object} ctx
 * @param {Object} ctx.org
 * @param {string} ctx.plan          plan id
 * @param {Object} ctx.planConfig    merged plan config (price in USD)
 * @param {Object} [ctx.invoiceMeta] extra notes for the order receipt
 * @returns {Promise<{ providerOrderId, amount, currency, clientPayload }>}
 */
async function createOrder({ org, plan, planConfig, invoiceMeta = {} }) {
  const razorpay = getRazorpayClient();
  // Explicit INR price (admin-set, or USD × RAZORPAY_USD_INR_RATE) → paise
  const rupees = planConfig.priceInr != null ? planConfig.priceInr : planConfig.price * 84;
  const amount = Math.round(rupees * 100);
  const receipt = (invoiceMeta.receipt || `rcpt_${Date.now()}`).slice(0, 40);

  const order = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt,
    notes: {
      orgId: org._id.toString(),
      planId: plan,
      ...(invoiceMeta.billingMonth ? { billingMonth: invoiceMeta.billingMonth } : {}),
    },
  });

  return {
    providerOrderId: order.id,
    amount,
    currency: 'INR',
    clientPayload: {
      orderId: order.id,
      key_id: process.env.RAZORPAY_KEY_ID,
    },
  };
}

// Constant-time comparison for hex signatures
function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Verify a Razorpay client-side payment via HMAC signature.
 * @param {Object} ctx
 * @param {Object} ctx.invoice       the pending invoice already loaded
 * @param {Object} ctx.body          request body from the front end
 */
async function verifyPayment({ invoice, body }) {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body || {};
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    throw new PaymentVerificationError('Missing payment verification details.');
  }
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  if (!safeEqualHex(expected, razorpay_signature)) {
    throw new PaymentVerificationError('Payment verification failed: invalid signature.');
  }
  return {
    ok: true,
    providerPaymentId: razorpay_payment_id,
    raw: { razorpay_order_id, razorpay_payment_id },
  };
}

/**
 * Verify a Razorpay webhook signature against the raw request body.
 * Must be mounted with express.raw so req.body is a Buffer.
 */
async function verifyWebhook(req) {
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) return { ok: false, reason: 'missing_signature' };
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[razorpay] RAZORPAY_WEBHOOK_SECRET is not set — webhooks cannot be verified');
    return { ok: false, reason: 'not_configured' };
  }
  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  if (!safeEqualHex(expected, signature)) return { ok: false, reason: 'bad_signature' };
  const event = JSON.parse(req.body.toString('utf8'));
  return { ok: true, event, raw: req.body };
}

/**
 * Apply a Razorpay webhook event: order.paid (settle), payment.failed (email
 * the owner), refund.processed (record refund; full refund ends the plan).
 */
async function handleWebhookEvent(event) {
  switch (event.event) {
    case 'order.paid': {
      const order = event.payload.order.entity;
      const payment = event.payload.payment?.entity;
      const invoice = await Invoice.findOne({ razorpayOrderId: order.id });
      if (!invoice) {
        console.warn(`[razorpay] webhook: no invoice for order ${order.id}`);
        return;
      }
      await settleInvoice(invoice._id, {
        providerPaymentId: payment?.id || null,
      });
      console.log(`[razorpay] order.paid settled for invoice ${invoice._id}`);
      return;
    }
    case 'payment.failed': {
      const payment = event.payload.payment?.entity;
      const invoice = payment?.order_id && await Invoice.findOne({ razorpayOrderId: payment.order_id });
      if (invoice && invoice.status !== 'paid') await notifyPaymentFailed(invoice);
      return;
    }
    case 'refund.processed': {
      const refund = event.payload.refund?.entity;
      const payment = event.payload.payment?.entity;
      const invoice = refund?.payment_id && await Invoice.findOne({ razorpayPaymentId: refund.payment_id });
      if (!invoice) {
        console.warn(`[razorpay] refund for unknown payment ${refund?.payment_id}`);
        return;
      }
      // amount_refunded on the payment is cumulative; fall back to this refund's amount
      const refundedTotal = payment?.amount_refunded ?? ((invoice.refundAmount || 0) + (refund.amount || 0));
      await applyRefund(invoice, refundedTotal);
      return;
    }
    default:
      console.log(`[razorpay] unhandled event: ${event.event}`);
  }
}

/** Full refund of an invoice's payment (admin action). The refund webhook follows. */
async function refundPayment(invoice) {
  if (!invoice.razorpayPaymentId) throw new Error('Invoice has no Razorpay payment id.');
  await getRazorpayClient().payments.refund(invoice.razorpayPaymentId, { amount: invoice.amount });
}

module.exports = {
  id: ID,
  refundPayment,
  isConfigured,
  createOrder,
  verifyPayment,
  verifyWebhook,
  handleWebhookEvent,
};
