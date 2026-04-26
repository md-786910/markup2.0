const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const Organization = require('../models/Organization');
const Invoice = require('../models/Invoice');
const { getLimitsForPlanAsync, getPlansWithOverrides } = require('../config/plans');
const { clearBillingLock } = require('../utils/orgUtils');

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

/**
 * Handles Razorpay webhook events.
 */
async function handleRazorpayWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).send('Missing signature');
    }

    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Razorpay webhook signature verification failed');
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(req.body.toString('utf8'));

    switch (event.event) {
      case 'order.paid': {
        const order = event.payload.order.entity;
        
        // Find the invoice linked to this order
        const invoice = await Invoice.findOne({ razorpayOrderId: order.id });
        
        if (invoice && invoice.status !== 'paid') {
          invoice.status = 'paid';
          
          const org = await Organization.findById(invoice.organization);
          if (org) {
            let periodStart = new Date();
            if (org.subscription && org.subscription.currentPeriodEnd && org.subscription.currentPeriodEnd > new Date() && org.plan === invoice.plan) {
              periodStart = new Date(org.subscription.currentPeriodEnd);
            }
            const periodEnd = new Date(periodStart);
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            invoice.periodStart = periodStart;
            invoice.periodEnd = periodEnd;
            await invoice.save();

            org.plan = invoice.plan;
            org.limits = await getLimitsForPlanAsync(invoice.plan);
            // Only auto-unlock billing locks; preserve manual admin locks.
            clearBillingLock(org);
            org.trialEndsAt = null;

            if (!org.subscription) org.subscription = {};
            org.subscription.status = 'active';
            org.subscription.currentPeriodEnd = periodEnd;
            
            await org.save();
            console.log(`[Razorpay] Order Paid: org ${org._id} unlocked, plan ${invoice.plan} extended to ${periodEnd}`);
          }
        }
        break;
      }

      default:
        console.log(`[Razorpay] Unhandled event type: ${event.event}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error(`[Razorpay] Webhook Error:`, err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}

module.exports = { handleRazorpayWebhook };
