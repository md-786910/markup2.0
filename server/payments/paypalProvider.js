/**
 * PayPal provider adapter.
 *
 * Uses @paypal/paypal-server-sdk (modern, supersedes deprecated
 * @paypal/checkout-server-sdk). Charges in USD natively — no INR conversion.
 *
 * Server-side capture pattern: client `onApprove` ONLY hands the orderID to
 * our backend; backend calls ordersCapture() server-side. Never call
 * actions.order.capture() in the browser — a malicious client could skip our
 * verify endpoint and we'd never settle the invoice.
 */

const Invoice = require('../models/Invoice');
const { settleInvoice } = require('./settleInvoice');
const { PaymentVerificationError } = require('./errors');

const ID = 'paypal';

let _client;
let _ordersController;
let _sdkLoadFailed = false;

function loadSdk() {
  if (_client) return { client: _client, ordersController: _ordersController };
  if (_sdkLoadFailed) return null;
  try {
    const sdk = require('@paypal/paypal-server-sdk');
    const env = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();
    const Environment = sdk.Environment;
    _client = new sdk.Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: process.env.PAYPAL_CLIENT_ID,
        oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET,
      },
      environment: env === 'production' ? Environment.Production : Environment.Sandbox,
      timeout: 0,
      logging: { logLevel: sdk.LogLevel?.Info, logRequest: { logBody: false }, logResponse: { logHeaders: false } },
    });
    _ordersController = new sdk.OrdersController(_client);
    return { client: _client, ordersController: _ordersController, sdk };
  } catch (err) {
    _sdkLoadFailed = true;
    console.warn('[paypal] SDK not installed yet:', err.message);
    return null;
  }
}

function isConfigured() {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return false;
  return !!loadSdk();
}

async function createOrder({ org, plan, planConfig, invoiceMeta = {} }) {
  const handles = loadSdk();
  if (!handles) throw new Error('PayPal SDK is not installed/configured.');
  const { ordersController } = handles;

  // Native USD pricing — store cents as the integer amount.
  const usd = Number(planConfig.price);
  if (!Number.isFinite(usd) || usd <= 0) throw new Error('Invalid USD price for plan.');
  const amountCents = Math.round(usd * 100);
  const value = (amountCents / 100).toFixed(2);

  const reqBody = {
    body: {
      intent: 'CAPTURE',
      purchaseUnits: [
        {
          amount: { currencyCode: 'USD', value },
          customId: org._id.toString(),
          description: `${plan} plan (1 month)`,
        },
      ],
    },
    prefer: 'return=representation',
  };

  const { result } = await ordersController.createOrder(reqBody);
  return {
    providerOrderId: result.id,
    amount: amountCents,
    currency: 'USD',
    clientPayload: {
      paypalOrderId: result.id,
      paypalClientId: process.env.PAYPAL_CLIENT_ID,
    },
  };
}

/**
 * Capture a PayPal order server-side. Client only forwards the orderID.
 */
async function verifyPayment({ invoice, body }) {
  const handles = loadSdk();
  if (!handles) throw new PaymentVerificationError('PayPal not configured.');
  const { ordersController } = handles;

  const paypalOrderId = body?.paypalOrderId || invoice?.paypalOrderId;
  if (!paypalOrderId) throw new PaymentVerificationError('Missing PayPal order id.');

  const { result } = await ordersController.captureOrder({
    id: paypalOrderId,
    prefer: 'return=representation',
  });

  // result.status should be COMPLETED. The capture id lives under purchase_units
  const status = result?.status;
  if (status !== 'COMPLETED') {
    throw new PaymentVerificationError(`PayPal capture not completed (status=${status}).`);
  }
  const capture = result?.purchaseUnits?.[0]?.payments?.captures?.[0];
  const captureId = capture?.id;

  return {
    ok: true,
    providerPaymentId: captureId,
    providerCaptureId: captureId,
    raw: result,
  };
}

/**
 * Verify a PayPal webhook by calling PayPal's notifications API.
 * Requires PAYPAL_WEBHOOK_ID set to the webhook id from the PayPal dashboard.
 * Must be mounted with express.raw so req.body is a Buffer.
 */
async function verifyWebhook(req) {
  const handles = loadSdk();
  if (!handles) return { ok: false, reason: 'sdk_unavailable' };

  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return { ok: false, reason: 'missing_webhook_id' };

  const headers = req.headers || {};
  const required = [
    'paypal-auth-algo',
    'paypal-cert-url',
    'paypal-transmission-id',
    'paypal-transmission-sig',
    'paypal-transmission-time',
  ];
  for (const h of required) {
    if (!headers[h]) return { ok: false, reason: `missing_header_${h}` };
  }

  const bodyText = req.body.toString('utf8');
  let webhookEvent;
  try {
    webhookEvent = JSON.parse(bodyText);
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }

  // Get an OAuth token, then POST verify-webhook-signature.
  const env = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();
  const apiBase = env === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const basic = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const tokenRes = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!tokenRes.ok) return { ok: false, reason: 'oauth_failed' };
  const { access_token: accessToken } = await tokenRes.json();

  const verifyRes = await fetch(`${apiBase}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: webhookEvent,
    }),
  });
  if (!verifyRes.ok) return { ok: false, reason: 'verify_call_failed' };
  const verifyJson = await verifyRes.json();
  if (verifyJson.verification_status !== 'SUCCESS') {
    return { ok: false, reason: 'bad_signature' };
  }

  return { ok: true, event: webhookEvent, raw: req.body };
}

async function handleWebhookEvent(event) {
  const type = event?.event_type;
  switch (type) {
    case 'CHECKOUT.ORDER.APPROVED': {
      // Buyer approved on the PayPal side. Capture happens server-side via
      // verifyPayment after the client posts the orderID. Just log here.
      const orderId = event.resource?.id;
      console.log(`[paypal] order approved (${orderId}) — awaiting capture.`);
      return;
    }
    case 'PAYMENT.CAPTURE.COMPLETED': {
      const capture = event.resource;
      const captureId = capture?.id;
      // supplementary_data.related_ids.order_id links capture → order
      const orderId =
        capture?.supplementary_data?.related_ids?.order_id ||
        capture?.supplementaryData?.relatedIds?.orderId;
      if (!orderId) {
        console.warn('[paypal] CAPTURE.COMPLETED without related order id');
        return;
      }
      const invoice = await Invoice.findOne({ paypalOrderId: orderId });
      if (!invoice) {
        console.warn(`[paypal] webhook: no invoice for paypal order ${orderId}`);
        return;
      }
      await settleInvoice(invoice._id, {
        providerPaymentId: captureId,
        providerCaptureId: captureId,
      });
      console.log(`[paypal] capture.completed settled for invoice ${invoice._id}`);
      return;
    }
    case 'PAYMENT.CAPTURE.DENIED': {
      const capture = event.resource;
      const orderId =
        capture?.supplementary_data?.related_ids?.order_id ||
        capture?.supplementaryData?.relatedIds?.orderId;
      if (!orderId) return;
      const invoice = await Invoice.findOne({ paypalOrderId: orderId });
      if (invoice && invoice.status === 'pending') {
        invoice.status = 'failed';
        await invoice.save();
        console.log(`[paypal] capture.denied marked invoice ${invoice._id} failed`);
      }
      return;
    }
    case 'PAYMENT.CAPTURE.REFUNDED': {
      // v1: log + flag for admin only. Do NOT auto-revoke plan or extend lock.
      // Refund handling (revocation, prorated lock) is a future workflow.
      const capture = event.resource;
      const orderId =
        capture?.supplementary_data?.related_ids?.order_id ||
        capture?.supplementaryData?.relatedIds?.orderId;
      console.warn(
        `[paypal] CAPTURE.REFUNDED for order ${orderId} — flagged for admin review (no auto-revoke).`
      );
      return;
    }
    default:
      console.log(`[paypal] unhandled event: ${type}`);
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
