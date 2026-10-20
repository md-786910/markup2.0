const razorpayProvider = require('../payments/razorpayProvider');

/**
 * Razorpay webhook endpoint. Signature verification + post-payment side
 * effects (settling the invoice, advancing the subscription, clearing locks)
 * live in `server/payments/razorpayProvider.js` + `server/payments/settleInvoice.js`.
 * This file is intentionally a thin shim so the same flow can be re-used
 * across providers.
 *
 * Mounted with express.raw so req.body is a Buffer (needed for HMAC).
 */
async function handleRazorpayWebhook(req, res) {
  try {
    const verified = await razorpayProvider.verifyWebhook(req);
    if (!verified.ok) {
      console.error(`[razorpay] webhook rejected: ${verified.reason}`);
      return res.status(400).send(`Invalid webhook (${verified.reason})`);
    }
    await razorpayProvider.handleWebhookEvent(verified.event);
    return res.json({ received: true });
  } catch (err) {
    console.error('[razorpay] webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
}

module.exports = { handleRazorpayWebhook };
