const paypalProvider = require('../payments/paypalProvider');

/**
 * PayPal webhook endpoint. Signature verification calls PayPal's
 * notifications API (see paypalProvider.verifyWebhook). All post-payment
 * side effects live in settleInvoice so this file stays a thin shim.
 *
 * Mounted with express.raw so req.body is a Buffer.
 */
async function handlePaypalWebhook(req, res) {
  try {
    const verified = await paypalProvider.verifyWebhook(req);
    if (!verified.ok) {
      console.error(`[paypal] webhook rejected: ${verified.reason}`);
      return res.status(400).send(`Invalid webhook (${verified.reason})`);
    }
    await paypalProvider.handleWebhookEvent(verified.event);
    return res.json({ received: true });
  } catch (err) {
    console.error('[paypal] webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
}

module.exports = { handlePaypalWebhook };
