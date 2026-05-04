const User = require('../models/User');
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const asyncHandler = require('../utils/asyncHandler');
const { UPGRADEABLE_PLANS, getLimitsForPlanAsync, getPlansWithOverrides } = require('../config/plans');
const { userResponse, attachPendingInvoice } = require('./auth.controller');
const { clearBillingLock } = require('../utils/orgUtils');
const {
  getActiveProvider,
  getProvider,
  getProviderStatus,
} = require('../payments');
const { settleInvoice } = require('../payments/settleInvoice');
const { PaymentProviderUnavailableError } = require('../payments/errors');

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

  // Clean up any stale pending invoices for this org before creating a fresh one.
  await Invoice.deleteMany({ organization: org._id, status: 'pending', billingMonth: null });

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
      { status: 'paid' },
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
  if (invoice.status !== 'paid') {
    return res.status(403).json({ message: 'Only paid invoices can be downloaded.' });
  }

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  const shortId = invoice._id.toString().slice(-8).toUpperCase();
  const filename = `invoice-${shortId}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.on('error', (err) => {
    console.error('[invoice-pdf] stream error:', err.message);
    if (!res.headersSent) res.status(500).end();
  });
  doc.pipe(res);

  const isUsd = invoice.currency === 'USD';
  const fmtMoney = (units) => {
    const major = (units || 0) / 100;
    if (isUsd) {
      return '$' + major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return 'Rs. ' + major.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString(isUsd ? 'en-US' : 'en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  // Header
  doc.fontSize(22).fillColor('#2563eb').text('Feedbackly', { continued: false });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#6b7280').text('Invoice receipt');
  doc.moveDown(1.2);

  // Invoice meta
  doc.fontSize(16).fillColor('#111827').text('Invoice ' + shortId);
  doc.moveDown(0.6);
  doc.fontSize(11).fillColor('#374151');
  doc.text('Billed to: ' + (org.name || 'Workspace'));
  doc.text('Billing date: ' + fmtDate(invoice.createdAt));
  if (invoice.billingMonth) doc.text('Billing month: ' + invoice.billingMonth);
  if (invoice.periodStart && invoice.periodEnd) {
    doc.text('Period: ' + fmtDate(invoice.periodStart) + '  to  ' + fmtDate(invoice.periodEnd));
  }
  doc.moveDown(1);

  // Line item table
  const tableTop = doc.y;
  doc.fontSize(10).fillColor('#6b7280');
  doc.text('DESCRIPTION', 50, tableTop);
  doc.text('AMOUNT', 400, tableTop, { width: 145, align: 'right' });
  doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).strokeColor('#e5e7eb').stroke();

  const rowY = tableTop + 22;
  doc.fontSize(12).fillColor('#111827');
  const planLabel = (invoice.plan || '').charAt(0).toUpperCase() + (invoice.plan || '').slice(1) + ' Plan';
  doc.text(planLabel + '  (1 month)', 50, rowY);
  doc.text(fmtMoney(invoice.amount), 400, rowY, { width: 145, align: 'right' });

  // Total
  const totalY = rowY + 30;
  doc.moveTo(50, totalY).lineTo(545, totalY).strokeColor('#e5e7eb').stroke();
  doc.fontSize(11).fillColor('#6b7280').text('Total', 400, totalY + 8, { width: 80, align: 'right' });
  doc.fontSize(13).fillColor('#111827').text(fmtMoney(invoice.amount), 480, totalY + 6, { width: 65, align: 'right' });

  // Status pill
  doc.moveDown(3);
  doc.fontSize(11).fillColor('#059669').text('Status: PAID');

  // Provider refs
  doc.moveDown(1);
  doc.fontSize(9).fillColor('#9ca3af');
  if (invoice.provider === 'razorpay') {
    if (invoice.razorpayOrderId) doc.text('Razorpay Order ID: ' + invoice.razorpayOrderId);
    if (invoice.razorpayPaymentId) doc.text('Razorpay Payment ID: ' + invoice.razorpayPaymentId);
  } else if (invoice.provider === 'paypal') {
    if (invoice.paypalOrderId) doc.text('PayPal Order ID: ' + invoice.paypalOrderId);
    if (invoice.paypalCaptureId) doc.text('PayPal Capture ID: ' + invoice.paypalCaptureId);
  }

  // Footer
  doc.moveDown(2);
  doc.fontSize(9).fillColor('#9ca3af').text('Generated by Feedbackly. This is a computer-generated receipt.', {
    align: 'center',
  });

  doc.end();
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

  org.plan = plan;
  org.limits = await getLimitsForPlanAsync(plan);
  clearBillingLock(org);
  org.trialEndsAt = null;

  if (!org.subscription) org.subscription = {};
  org.subscription.status = 'active';
  if (plan === 'free') {
    org.subscription.currentPeriodEnd = null;
  } else {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    org.subscription.currentPeriodEnd = periodEnd;
  }

  await org.save();
  await attachPendingInvoice(org);

  res.json({
    message: `Successfully activated ${mergedPlans[plan]?.name || plan}`,
    user: userResponse(req.user, org),
    plan: org.plan,
  });
});
