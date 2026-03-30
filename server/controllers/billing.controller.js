const User = require('../models/User');
const Project = require('../models/Project');
const asyncHandler = require('../utils/asyncHandler');
const { PLANS, UPGRADEABLE_PLANS, getLimitsForPlan } = require('../config/plans');
const { userResponse } = require('./auth.controller');
const stripe = require('../config/stripe');

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

/**
 * GET /api/billing/plan
 * Returns current plan details, limits, usage, and trial info.
 */
exports.getPlan = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) {
    return res.status(500).json({ message: 'Organization context missing' });
  }

  const [projectCount, memberCount, guestCount] = await Promise.all([
    Project.countDocuments({ organization: org._id }),
    User.countDocuments({ organization: org._id, role: { $in: ['owner', 'admin', 'member'] } }),
    User.countDocuments({ organization: org._id, role: 'guest' }),
  ]);

  const planId = org.plan;
  const planDetails = PLANS[planId] || PLANS.free;

  // Trial info
  let trial = null;
  if (planId === 'trial' && org.trialEndsAt) {
    const msLeft = new Date(org.trialEndsAt).getTime() - Date.now();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    trial = {
      active: daysLeft > 0,
      endsAt: org.trialEndsAt,
      daysLeft,
      trialDays: org.trialDays,
    };
  }

  res.json({
    plan: planId,
    planDetails,
    limits: org.limits,
    usage: {
      projects: projectCount,
      members: memberCount,
      guests: guestCount,
    },
    trial,
    subscription: org.subscription,
  });
});

/**
 * POST /api/billing/checkout-session
 * Creates a Stripe Checkout session for plan upgrade.
 */
exports.createCheckoutSession = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) {
    return res.status(500).json({ message: 'Organization context missing' });
  }

  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Only the organization owner can upgrade the plan.' });
  }

  const { plan } = req.body;
  if (!plan || !UPGRADEABLE_PLANS.includes(plan)) {
    return res.status(400).json({ message: `Invalid plan. Choose one of: ${UPGRADEABLE_PLANS.join(', ')}` });
  }

  const planConfig = PLANS[plan];
  if (!planConfig.stripePriceId) {
    return res.status(400).json({ message: 'Stripe price not configured for this plan. Contact support.' });
  }

  // Create or retrieve Stripe customer
  let customerId = org.subscription.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.user.email,
      name: org.name,
      metadata: {
        orgId: org._id.toString(),
        userId: req.user._id.toString(),
      },
    });
    customerId = customer.id;
    org.subscription.stripeCustomerId = customerId;
    await org.save();
  }

  // Create Checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price: planConfig.stripePriceId,
      quantity: 1,
    }],
    success_url: `${CLIENT_ORIGIN}/settings?tab=billing&status=success`,
    cancel_url: `${CLIENT_ORIGIN}/settings?tab=billing&status=canceled`,
    metadata: {
      orgId: org._id.toString(),
      planId: plan,
    },
    subscription_data: {
      metadata: {
        orgId: org._id.toString(),
        planId: plan,
      },
    },
  });

  res.json({ url: session.url });
});

/**
 * POST /api/billing/portal-session
 * Creates a Stripe Customer Portal session for subscription management.
 */
exports.createPortalSession = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) {
    return res.status(500).json({ message: 'Organization context missing' });
  }

  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Only the organization owner can manage the subscription.' });
  }

  const customerId = org.subscription.stripeCustomerId;
  if (!customerId) {
    return res.status(400).json({ message: 'No active subscription found.' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${CLIENT_ORIGIN}/settings?tab=billing`,
  });

  res.json({ url: session.url });
});

/**
 * POST /api/billing/upgrade
 * Fallback: upgrades without Stripe (for testing/dev or when Stripe is not configured).
 */
exports.upgradePlan = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) {
    return res.status(500).json({ message: 'Organization context missing' });
  }

  // Only owner can upgrade
  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Only the organization owner can upgrade the plan.' });
  }

  const { plan } = req.body;
  if (!plan || !UPGRADEABLE_PLANS.includes(plan)) {
    return res.status(400).json({ message: `Invalid plan. Choose one of: ${UPGRADEABLE_PLANS.join(', ')}` });
  }

  // Prevent "upgrading" to the same or lower plan
  const currentOrder = org.plan === 'trial' ? -1 : (PLANS[org.plan]?.order ?? -1);
  const targetOrder = PLANS[plan].order;
  if (targetOrder <= currentOrder) {
    return res.status(400).json({ message: 'You can only upgrade to a higher plan.' });
  }

  // Apply the upgrade
  org.plan = plan;
  org.limits = getLimitsForPlan(plan);
  org.isLocked = false;
  org.lockedAt = null;
  org.lockedReason = null;
  org.trialEndsAt = null;
  org.subscription.status = 'active';

  await org.save();

  res.json({
    message: `Successfully upgraded to ${PLANS[plan].name}`,
    user: userResponse(req.user, org),
    plan: org.plan,
  });
});
