const User = require('../models/User');
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const asyncHandler = require('../utils/asyncHandler');
const { UPGRADEABLE_PLANS, getLimitsForPlanAsync, getPlansWithOverrides } = require('../config/plans');
const { userResponse, attachPendingInvoice } = require('./auth.controller');
const { clearBillingLock } = require('../utils/orgUtils');
const { addMonthsUTC } = require('../utils/billingDates');
const { renderInvoicePdf } = require('../payments/invoiceIssuer');
const {
  getActiveProvider,
  getProvider,
  getProviderStatus,
} = require('../payments');
const { settleInvoice } = require('../payments/settleInvoice');
const { PaymentProviderUnavailableError } = require('../payments/errors');
const { logOrgActivity } = require('../utils/activityLogger');
const { URLS } = require('../config/env');

const CLIENT_ORIGIN = URLS.app;

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

  await attachPendingInvoice(org);

  res.json({
    plan: planId,
    planDetails,
    limits: org.limits,
    usage: {
      projects: projectCount,
      members: memberCount,
      guests: guestCount,
      storageMB: Math.round(((org.storageUsedBytes || 0) / (1024 * 1024)) * 10) / 10,
    },
    trial,
    subscription: org.subscription,
    pendingInvoice: org._pendingInvoice || null,
  });
});

/**
 * GET /api/billing/config
 * Returns the active provider id + the public credentials the front end
 * needs (Razorpay key_id, PayPal client-id) so UpgradeModal can render the
 * appropriate checkout. If no provider is active, returns activeProvider:null
 * and the UI shows the standard "facing payment issues" message.
 */
exports.getBillingConfig = asyncHandler(async (req, res) => {
  const status = await getProviderStatus();
  const activeProvider = status.activeProvider;
  const payload = { activeProvider };
  if (activeProvider === 'razorpay') {
    payload.razorpay = { keyId: process.env.RAZORPAY_KEY_ID || null };
  }
  if (activeProvider === 'paypal') {
    payload.paypal = {
      clientId: process.env.PAYPAL_CLIENT_ID || null,
      currency: 'USD',
      env: (process.env.PAYPAL_ENV || 'sandbox').toLowerCase(),
    };
  }
  res.json(payload);
});

/**
 * POST /api/billing/checkout-session
 * Creates a one-month order via the active payment provider.
 * Returns 503 with the standard "facing payment issues" message if neither
 * provider is active.
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

  if (org.plan === plan && !org.isLocked && org.subscription?.status === 'active') {
    return res.status(400).json({ message: 'You already have this active plan.' });
  }

  const provider = await getActiveProvider();
  if (!provider) {
    const err = new PaymentProviderUnavailableError();
    return res.status(err.statusCode).json({ message: err.message });
  }

  // Supersede stale checkout invoices instead of deleting them: if an older
  // order still gets paid (second tab, slow payment), its webhook must find the
  // invoice so the customer isn't charged without receiving the plan.
  await Invoice.updateMany(
    { organization: org._id, status: 'pending', billingMonth: null },
    { $set: { status: 'void' } },
  );

  const order = await provider.createOrder({
    org,
    plan,
    planConfig,
    invoiceMeta: { receipt: `rcpt_${Date.now()}` },
  });

  const invoiceDoc = {
    organization: org._id,
    plan,
    amount: order.amount,
    currency: order.currency,
    status: 'pending',
    provider: provider.id,
  };
  if (provider.id === 'razorpay') invoiceDoc.razorpayOrderId = order.providerOrderId;
  if (provider.id === 'paypal') invoiceDoc.paypalOrderId = order.providerOrderId;

  const invoice = await Invoice.create(invoiceDoc);

  res.json({
    provider: provider.id,
    invoiceId: invoice._id,
    amount: order.amount,
    currency: order.currency,
    ...order.clientPayload,
  });
});

/**
 * POST /api/billing/verify-payment
 * Polymorphic: looks up the invoice by either razorpayOrderId or paypalOrderId
 * (whichever the body identifies), dispatches to the correct provider's
 * verifyPayment, then runs the shared settleInvoice helper.
 */
exports.verifyPayment = asyncHandler(async (req, res) => {
  const org = req.organization;
  const body = req.body || {};

  let invoice = null;
  if (body.razorpay_order_id) {
    invoice = await Invoice.findOne({ razorpayOrderId: body.razorpay_order_id });
  } else if (body.paypalOrderId) {
    invoice = await Invoice.findOne({ paypalOrderId: body.paypalOrderId });
  } else if (body.invoiceId) {
    invoice = await Invoice.findById(body.invoiceId);
  }
  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found for this order.' });
  }
  if (!invoice.organization.equals(org._id)) {
    return res.status(403).json({ message: 'Not your invoice.' });
  }

  if (invoice.status === 'paid') {
    await attachPendingInvoice(org);
    return res.json({ message: 'Invoice already paid.', user: userResponse(req.user, org) });
  }

  const provider = getProvider(invoice.provider);
  if (!provider) {
    return res.status(500).json({ message: `Unknown provider on invoice: ${invoice.provider}` });
  }

  let verifyResult;
  try {
    verifyResult = await provider.verifyPayment({ invoice, body });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ message: err.message });
  }

  if (!verifyResult?.ok) {
    return res.status(400).json({ message: 'Payment verification failed.' });
  }

  const previousPlan = org.plan;
  const settled = await settleInvoice(invoice._id, {
    providerPaymentId: verifyResult.providerPaymentId,
    providerCaptureId: verifyResult.providerCaptureId,
  });
  if (!settled.ok) {
    return res.status(500).json({ message: `Failed to settle invoice (${settled.reason}).` });
  }

  // Reload org so the response reflects the new plan/subscription state.
  const Organization = require('../models/Organization');
  const updatedOrg = await Organization.findById(org._id);
  await attachPendingInvoice(updatedOrg);

  // Emit org-activity for the payment + the implicit plan upgrade.
  const mergedPlans = await getPlansWithOverrides();
  logOrgActivity(updatedOrg._id, req.user._id, 'billing.payment_succeeded', {
    amount: invoice.amount,
    currency: invoice.currency,
    plan: updatedOrg.plan,
    planName: mergedPlans[updatedOrg.plan]?.name || updatedOrg.plan,
    provider: invoice.provider,
  });
  if (previousPlan !== updatedOrg.plan) {
    logOrgActivity(updatedOrg._id, req.user._id, 'org.plan_upgraded', {
      from: previousPlan,
      to: updatedOrg.plan,
      fromName: mergedPlans[previousPlan]?.name || previousPlan,
      toName: mergedPlans[updatedOrg.plan]?.name || updatedOrg.plan,
    });
  }

  res.json({
    message: 'Payment verified and plan activated successfully!',
    user: userResponse(req.user, updatedOrg),
    plan: updatedOrg.plan,
    currentPeriodEnd: settled.periodEnd,
  });
});

/**
 * GET /api/billing/invoices
 * Lists invoices the customer should see: all paid history + pending invoices
 * generated by the daily billing cron (those have `billingMonth` set). Aborted
 * upgrade attempts (pending, no billingMonth) are kept in the DB for admin
 * triage but hidden from customers.
 */
exports.getInvoices = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) {
    return res.status(500).json({ message: 'Organization context missing' });
  }

  const invoices = await Invoice.find({
    organization: org._id,
    $or: [
      { status: { $in: ['paid', 'refunded'] } },
      { status: 'pending', billingMonth: { $type: 'string' } },
    ],
  }).sort({ createdAt: -1 });

  res.json({
    invoices,
    key_id: process.env.RAZORPAY_KEY_ID,
    paypalClientId: process.env.PAYPAL_CLIENT_ID || null,
  });
});

/**
 * GET /api/billing/invoices/:id/pdf
 * Streams a PDF receipt for a paid invoice belonging to the requester's org.
 * Currency-aware: branches between INR (Razorpay) and USD (PayPal) formatting.
 */
exports.downloadInvoicePdf = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) {
    return res.status(500).json({ message: 'Organization context missing' });
  }

  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) {
    return res.status(404).json({ message: 'Invoice not found.' });
  }
  if (!invoice.organization.equals(org._id)) {
    return res.status(403).json({ message: 'Not your invoice.' });
  }
  if (invoice.status !== 'paid' && invoice.status !== 'refunded') {
    return res.status(403).json({ message: 'Only paid invoices can be downloaded.' });
  }

  const filename = `invoice-${invoice.invoiceNumber || invoice._id.toString().slice(-8).toUpperCase()}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = renderInvoicePdf(invoice, org, res);
  doc.on('error', (err) => {
    console.error('[invoice-pdf] stream error:', err.message);
    if (!res.headersSent) res.status(500).end();
  });
});

/**
 * POST /api/billing/portal-session
 * Razorpay/PayPal don't expose a hosted customer portal natively.
 */
exports.createPortalSession = asyncHandler(async (req, res) => {
  return res.status(400).json({ message: 'Customer portal not supported natively. Please view the Invoices tab.' });
});

/**
 * POST /api/billing/upgrade
 * No-payment upgrade path (free plan or admin-driven). Does not touch any
 * payment provider — pure plan/limits state mutation.
 */
exports.upgradePlan = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) {
    return res.status(500).json({ message: 'Organization context missing' });
  }

  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Only the organization owner can upgrade the plan.' });
  }

  const { plan } = req.body;
  const ALLOWED = [...UPGRADEABLE_PLANS, 'free'];
  if (!plan || !ALLOWED.includes(plan)) {
    return res.status(400).json({ message: `Invalid plan. Choose one of: ${ALLOWED.join(', ')}` });
  }

  const mergedPlans = await getPlansWithOverrides();

  if (org.plan === plan && org.isLocked === false) {
    return res.status(400).json({ message: 'You already have this active plan.' });
  }

  const targetOrder = mergedPlans[plan]?.order ?? 0;
  const currentOrder = org.plan === 'trial' ? -1 : (mergedPlans[org.plan]?.order ?? -1);
  const isDowngrade = targetOrder < currentOrder;

  // This endpoint never takes payment. Paid plans are only reachable here as a
  // downgrade from an active, unlocked paid subscription (e.g. pro -> starter);
  // upgrades, re-activations and unlocking an overdue org go through checkout.
  const isPaidTarget = plan !== 'free';
  if (isPaidTarget) {
    const hasActivePaidPlan = UPGRADEABLE_PLANS.includes(org.plan)
      && org.subscription?.status === 'active'
      && !org.isLocked;
    if (!isDowngrade || !hasActivePaidPlan) {
      return res.status(402).json({ message: 'Please complete checkout to activate this plan.', code: 'PAYMENT_REQUIRED' });
    }
  }

  // Block downgrades unless the admin has explicitly allowed them.
  if (isDowngrade) {
    const status = await getProviderStatus();
    if (!status.allowDowngrades) {
      return res.status(400).json({ message: 'Plan downgrades are currently disabled.' });
    }
  }

  const previousPlan = org.plan;
  org.plan = plan;
  org.limits = await getLimitsForPlanAsync(plan);
  if (!isPaidTarget) clearBillingLock(org);
  org.trialEndsAt = null;

  if (!org.subscription) org.subscription = {};
  org.subscription.status = 'active';
  if (plan === 'free') {
    org.subscription.currentPeriodEnd = null;
  } else if (!org.subscription.currentPeriodEnd) {
    // Paid downgrade keeps the already-paid period; only set one if missing.
    org.subscription.currentPeriodEnd = addMonthsUTC(new Date(), 1);
  }

  await org.save();

  // Moving to free ends billing: unpaid invoices must not lock the org later.
  if (plan === 'free') {
    await Invoice.updateMany(
      { organization: org._id, status: 'pending' },
      { $set: { status: 'void' } },
    );
  }
  await attachPendingInvoice(org);

  // Emit org-activity. Only meaningful when this is a tier change (skip the
  // trial→free no-op and re-activations of the same plan, both already
  // filtered earlier).
  if (previousPlan !== plan) {
    const action = targetOrder < currentOrder ? 'org.plan_downgraded' : 'org.plan_upgraded';
    logOrgActivity(org._id, req.user._id, action, {
      from: previousPlan,
      to: plan,
      fromName: mergedPlans[previousPlan]?.name || previousPlan,
      toName: mergedPlans[plan]?.name || plan,
    });
  }

  res.json({
    message: `Successfully activated ${mergedPlans[plan]?.name || plan}`,
    user: userResponse(req.user, org),
    plan: org.plan,
  });
});

/**
 * POST /api/billing/cancel
 * Cancel at period end: the paid plan stays until currentPeriodEnd, then the
 * daily billing job moves the org to free. No further invoices are created.
 */
exports.cancelSubscription = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) return res.status(500).json({ message: 'Organization context missing' });
  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Only the organization owner can cancel the subscription.' });
  }
  if (!UPGRADEABLE_PLANS.includes(org.plan) || !org.subscription?.currentPeriodEnd) {
    return res.status(400).json({ message: 'There is no paid subscription to cancel.' });
  }
  org.subscription.cancelAtPeriodEnd = true;
  // The billing job issues the renewal invoice a day early and moves
  // currentPeriodEnd forward at the same time. If that renewal is still unpaid,
  // the new month was never paid for: void it and take the month back off.
  const unpaidRenewal = await Invoice.findOne({ organization: org._id, status: 'pending', billingMonth: { $type: 'string' } });
  if (unpaidRenewal) {
    unpaidRenewal.status = 'void';
    await unpaidRenewal.save();
    org.subscription.currentPeriodEnd = addMonthsUTC(org.subscription.currentPeriodEnd, -1);
  }
  await org.save();

  const mergedPlans = await getPlansWithOverrides();
  logOrgActivity(org._id, req.user._id, 'org.subscription_canceled', { plan: org.plan, endsAt: org.subscription.currentPeriodEnd });
  require('../utils/mailer')
    .sendSubscriptionCanceledEmail(req.user.email, org.name, mergedPlans[org.plan]?.name || org.plan, org.subscription.currentPeriodEnd, `${CLIENT_ORIGIN}/settings?tab=billing`)
    .catch((err) => console.error('[billing] cancel email failed:', err.message));

  await attachPendingInvoice(org);
  res.json({ message: 'Subscription cancelled', user: userResponse(req.user, org), subscription: org.subscription });
});

/**
 * POST /api/billing/resume
 * Undo a cancellation before the period ends.
 */
exports.resumeSubscription = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) return res.status(500).json({ message: 'Organization context missing' });
  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Only the organization owner can manage the subscription.' });
  }
  if (!org.subscription?.cancelAtPeriodEnd) {
    return res.status(400).json({ message: 'The subscription is not cancelled.' });
  }
  org.subscription.cancelAtPeriodEnd = false;
  await org.save();
  logOrgActivity(org._id, req.user._id, 'org.subscription_resumed', { plan: org.plan });
  await attachPendingInvoice(org);
  res.json({ message: 'Subscription resumed', user: userResponse(req.user, org), subscription: org.subscription });
});

/**
 * GET/PUT /api/billing/details
 * Buyer details printed on tax invoices (legal name, address, state, GSTIN/VAT).
 */
exports.getBillingDetails = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) return res.status(500).json({ message: 'Organization context missing' });
  res.json({ billingDetails: org.billingDetails || {} });
});

exports.updateBillingDetails = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!org) return res.status(500).json({ message: 'Organization context missing' });
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only the owner or an admin can edit billing details.' });
  }
  const b = req.body || {};
  const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const taxId = clean(b.taxId, 20).toUpperCase();
  // Indian GSTIN: 15 chars, e.g. 27AAPFU0939F1ZV. Other countries' VAT ids are free-form.
  if (taxId && /^(IN|INDIA)$/i.test(clean(b.country, 60)) && !/^[0-9]{2}[A-Z0-9]{10}[0-9A-Z]{3}$/.test(taxId)) {
    return res.status(400).json({ message: 'GSTIN must be 15 characters, e.g. 27AAPFU0939F1ZV.' });
  }
  org.billingDetails = {
    legalName: clean(b.legalName, 120),
    address: clean(b.address, 300),
    country: clean(b.country, 60),
    state: clean(b.state, 60),
    taxId,
  };
  await org.save();
  res.json({ billingDetails: org.billingDetails });
});
