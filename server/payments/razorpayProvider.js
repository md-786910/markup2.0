const crypto = require('crypto');
const { settleInvoice } = require('./settleInvoice');
const Invoice = require('../models/Invoice');
const { PaymentVerificationError } = require('./errors');

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
  // USD display price → INR paise (existing Razorpay India pricing math)
  const amount = Math.round(planConfig.price * 84 * 100);
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
  if (expected !== razorpay_signature) {
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
  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  if (expected !== signature) return { ok: false, reason: 'bad_signature' };
  const event = JSON.parse(req.body.toString('utf8'));
  return { ok: true, event, raw: req.body };
}

/**
 * Apply a Razorpay webhook event. Currently only `order.paid` is handled.
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
    default:
      console.log(`[razorpay] unhandled event: ${event.event}`);
  }
}

module.exports = {
  id: ID,
  isConfigured,
  createOrder,
  verifyPayment,
  verifyWebhook,
  handleWebhookEvent,
};
