const stripe = require('../config/stripe');
const Organization = require('../models/Organization');
const { PLANS, getLimitsForPlan } = require('../config/plans');

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Find plan ID from Stripe price ID.
 */
function planIdFromPriceId(priceId) {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.stripePriceId === priceId) return key;
  }
  return null;
}

/**
 * POST /api/billing/webhook
 * Handles Stripe webhook events. Must receive raw body (mounted before express.json()).
 */
async function handleStripeWebhook(req, res) {
  let event;

  try {
    const sig = req.headers['stripe-signature'];
    if (!WEBHOOK_SECRET) {
      // In dev mode without webhook secret, parse event directly
      event = JSON.parse(req.body.toString());
    } else {
      event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
    }
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orgId = session.metadata?.orgId;
        const planId = session.metadata?.planId;

        if (!orgId || !planId) break;

        const org = await Organization.findById(orgId);
        if (!org) break;

        org.plan = planId;
        org.limits = getLimitsForPlan(planId);
        org.isLocked = false;
        org.lockedAt = null;
        org.lockedReason = null;
        org.trialEndsAt = null;
        org.subscription.status = 'active';
        org.subscription.externalId = session.subscription;
        if (session.customer) {
          org.subscription.stripeCustomerId = session.customer;
        }

        await org.save();
        console.log(`[Stripe] Checkout completed: org ${orgId} upgraded to ${planId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const orgId = subscription.metadata?.orgId;

        const org = orgId
          ? await Organization.findById(orgId)
          : await Organization.findOne({ 'subscription.externalId': subscription.id });

        if (!org) break;

        // Sync plan from price
        const priceId = subscription.items?.data?.[0]?.price?.id;
        if (priceId) {
          const newPlanId = planIdFromPriceId(priceId);
          if (newPlanId && newPlanId !== org.plan) {
            org.plan = newPlanId;
            org.limits = getLimitsForPlan(newPlanId);
            org.subscription.stripePriceId = priceId;
          }
        }

        // Sync subscription status
        org.subscription.status = subscription.status === 'active' ? 'active'
          : subscription.status === 'past_due' ? 'past_due'
          : subscription.status === 'canceled' ? 'canceled'
          : org.subscription.status;

        org.subscription.currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : org.subscription.currentPeriodEnd;

        org.subscription.externalId = subscription.id;

        // Unlock if active
        if (subscription.status === 'active') {
          org.isLocked = false;
          org.lockedAt = null;
          org.lockedReason = null;
        }

        await org.save();
        console.log(`[Stripe] Subscription updated: org ${org._id}, status: ${subscription.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const orgId = subscription.metadata?.orgId;

        const org = orgId
          ? await Organization.findById(orgId)
          : await Organization.findOne({ 'subscription.externalId': subscription.id });

        if (!org) break;

        // Downgrade to free
        org.plan = 'free';
        org.limits = getLimitsForPlan('free');
        org.subscription.status = 'canceled';
        org.subscription.externalId = null;
        org.subscription.stripePriceId = null;

        await org.save();
        console.log(`[Stripe] Subscription deleted: org ${org._id} downgraded to free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        const org = await Organization.findOne({ 'subscription.externalId': subscriptionId });
        if (!org) break;

        org.subscription.status = 'past_due';
        await org.save();
        console.log(`[Stripe] Payment failed: org ${org._id} marked as past_due`);
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }
  } catch (err) {
    console.error(`[Stripe] Error handling ${event.type}:`, err.message);
  }

  // Always return 200 to acknowledge receipt
  res.json({ received: true });
}

module.exports = { handleStripeWebhook };
