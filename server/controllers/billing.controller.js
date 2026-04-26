const User = require('../models/User');
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const asyncHandler = require('../utils/asyncHandler');
const { PLANS, UPGRADEABLE_PLANS, getLimitsForPlanAsync, getPlansWithOverrides } = require('../config/plans');
const { userResponse } = require('./auth.controller');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');

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
  const mergedPlans = await getPlansWithOverrides();
  const planDetails = mergedPlans[planId] || mergedPlans.free;

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
 * Creates a Razorpay Order for a 1-month plan upgrade/renewal.
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

  const mergedPlans = await getPlansWithOverrides();
  const planConfig = mergedPlans[plan];
  
  if (!planConfig || planConfig.price == null) {
    return res.status(400).json({ message: 'Price is not configured for this plan. Contact support.' });
  }

  // Prevent renewing a plan that is already active (unless it's within a few days of expiry, but let's just keep it simple)
  if (org.plan === plan && !org.isLocked && org.subscription?.status === 'active') {
    return res.status(400).json({ message: 'You already have this active plan.' });
  }

  // Assuming price is in USD, convert to INR roughly (e.g. 1 USD = 84 INR) for Razorpay India
  const amountInPaise = Math.round(planConfig.price * 84 * 100);

  // Clean up any existing pending invoices for this organization to avoid clutter
  await Invoice.deleteMany({
    organization: org._id,
    status: 'pending'
  });

  // Create Razorpay Order
  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    notes: {
      orgId: org._id.toString(),
      planId: plan,
    },
  });

  // Create a pending invoice in our DB
  const invoice = await Invoice.create({
    organization: org._id,
    plan: plan,
    amount: amountInPaise,
    currency: 'INR',
    status: 'pending',
    razorpayOrderId: order.id,
  });

  // We return the order_id and razorpay key_id to the client so it can open the Razorpay Checkout
  res.json({ 
    orderId: order.id,
    invoiceId: invoice._id,
    amount: amountInPaise,
    currency: 'INR',
    key_id: process.env.RAZORPAY_KEY_ID 
  });
});

/**
 * POST /api/billing/verify-payment
 * Verifies Razorpay payment signature and activates the plan for 1 month.
 */
exports.verifyPayment = asyncHandler(async (req, res) => {
  const org = req.organization;
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Missing payment verification details.' });
  }

  // Verify Signature
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest('hex');

  if (generated_signature !== razorpay_signature) {
    return res.status(400).json({ message: 'Payment verification failed: Invalid signature' });
  }

  // Find the pending invoice
  const invoice = await Invoice.findOne({ razorpayOrderId: razorpay_order_id });
  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found for this order.' });
  }

  if (invoice.status === 'paid') {
    return res.json({ message: 'Invoice already paid.', user: userResponse(req.user, org) });
  }

  // Update invoice
  invoice.status = 'paid';
  invoice.razorpayPaymentId = razorpay_payment_id;
  
  // Calculate new period start/end (1 month from now, or 1 month from existing future end date)
  let periodStart = new Date();
  if (org.subscription && org.subscription.currentPeriodEnd && org.subscription.currentPeriodEnd > new Date() && org.plan === invoice.plan) {
    periodStart = new Date(org.subscription.currentPeriodEnd);
  }
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  invoice.periodStart = periodStart;
  invoice.periodEnd = periodEnd;
  await invoice.save();

  // Apply the upgrade to the organization
  org.plan = invoice.plan;
  org.limits = await getLimitsForPlanAsync(invoice.plan);
  org.isLocked = false;
  org.lockedAt = null;
  org.lockedReason = null;
  org.trialEndsAt = null;
  
  if (!org.subscription) org.subscription = {};
  org.subscription.status = 'active';
  org.subscription.currentPeriodEnd = periodEnd;
  
  await org.save();

  res.json({
    message: 'Payment verified and plan activated successfully!',
    user: userResponse(req.user, org),
    plan: org.plan,
    currentPeriodEnd: periodEnd
  });
});

/**
 * GET /api/billing/invoices
 * Lists all invoices for the organization
 */
exports.getInvoices = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) {
    return res.status(500).json({ message: 'Organization context missing' });
  }

  const invoices = await Invoice.find({ organization: org._id }).sort({ createdAt: -1 });
  res.json({ invoices, key_id: process.env.RAZORPAY_KEY_ID });
});

/**
 * POST /api/billing/portal-session
 * Fallback portal for razorpay doesn't exist as a hosted page by default.
 */
exports.createPortalSession = asyncHandler(async (req, res) => {
  return res.status(400).json({ message: 'Customer portal not supported natively. Please view the Invoices tab.' });
});

/**
 * POST /api/billing/upgrade
 * Fallback: upgrades without Razorpay (for testing/dev or when Razorpay is not configured).
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

  const mergedPlans = await getPlansWithOverrides();

  // Prevent "upgrading" to the same or lower plan
  const currentOrder = org.plan === 'trial' ? -1 : (mergedPlans[org.plan]?.order ?? -1);
  const targetOrder = mergedPlans[plan]?.order ?? 0;
  if (targetOrder <= currentOrder && org.plan === plan && org.isLocked === false) {
    return res.status(400).json({ message: 'You already have this active plan.' });
  }

  // Apply the upgrade (for 1 month)
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  org.plan = plan;
  org.limits = await getLimitsForPlanAsync(plan);
  org.isLocked = false;
  org.lockedAt = null;
  org.lockedReason = null;
  org.trialEndsAt = null;
  
  if (!org.subscription) org.subscription = {};
  org.subscription.status = 'active';
  org.subscription.currentPeriodEnd = periodEnd;

  await org.save();

  res.json({
    message: `Successfully upgraded to ${mergedPlans[plan]?.name || plan}`,
    user: userResponse(req.user, org),
    plan: org.plan,
  });
});