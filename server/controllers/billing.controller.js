const User = require('../models/User');
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const asyncHandler = require('../utils/asyncHandler');
const { PLANS, UPGRADEABLE_PLANS, getLimitsForPlanAsync, getPlansWithOverrides } = require('../config/plans');
const { userResponse, attachPendingInvoice } = require('./auth.controller');
const { clearBillingLock } = require('../utils/orgUtils');
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
    await attachPendingInvoice(org);
    return res.json({ message: 'Invoice already paid.', user: userResponse(req.user, org) });
  }

  // Update invoice
  invoice.status = 'paid';
  invoice.razorpayPaymentId = razorpay_payment_id;
  
  // currentPeriodEnd anchors this org's billing anniversary; the daily cron
  // (server/scripts/runBilling.js) generates the next invoice when this date arrives.
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
  // Only auto-unlock if the lock was set by billing (overdue/trial). Manual admin
  // locks stay in place — customers can't pay themselves out of an admin lock.
  clearBillingLock(org);
  org.trialEndsAt = null;

  if (!org.subscription) org.subscription = {};
  org.subscription.status = 'active';
  org.subscription.currentPeriodEnd = periodEnd;

  await org.save();
  await attachPendingInvoice(org);

  res.json({
    message: 'Payment verified and plan activated successfully!',
    user: userResponse(req.user, org),
    plan: org.plan,
    currentPeriodEnd: periodEnd
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
  res.json({ invoices, key_id: process.env.RAZORPAY_KEY_ID });
});

/**
 * GET /api/billing/invoices/:id/pdf
 * Streams a PDF receipt for a paid invoice belonging to the requester's org.
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

  const rs = (paise) =>
    'Rs. ' + ((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

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
  doc.text(rs(invoice.amount), 400, rowY, { width: 145, align: 'right' });

  // Total
  const totalY = rowY + 30;
  doc.moveTo(50, totalY).lineTo(545, totalY).strokeColor('#e5e7eb').stroke();
  doc.fontSize(11).fillColor('#6b7280').text('Total', 400, totalY + 8, { width: 80, align: 'right' });
  doc.fontSize(13).fillColor('#111827').text(rs(invoice.amount), 480, totalY + 6, { width: 65, align: 'right' });

  // Status pill
  doc.moveDown(3);
  doc.fontSize(11).fillColor('#059669').text('Status: PAID');

  // Razorpay refs
  doc.moveDown(1);
  doc.fontSize(9).fillColor('#9ca3af');
  if (invoice.razorpayOrderId) doc.text('Razorpay Order ID: ' + invoice.razorpayOrderId);
  if (invoice.razorpayPaymentId) doc.text('Razorpay Payment ID: ' + invoice.razorpayPaymentId);

  // Footer
  doc.moveDown(2);
  doc.fontSize(9).fillColor('#9ca3af').text('Generated by Feedbackly. This is a computer-generated receipt.', {
    align: 'center',
  });

  doc.end();
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
  // Free is a valid target alongside the paid UPGRADEABLE_PLANS — it activates
  // the workspace on the catalog's free tier (no Razorpay, no recurring bill).
  const ALLOWED = [...UPGRADEABLE_PLANS, 'free'];
  if (!plan || !ALLOWED.includes(plan)) {
    return res.status(400).json({ message: `Invalid plan. Choose one of: ${ALLOWED.join(', ')}` });
  }

  const mergedPlans = await getPlansWithOverrides();

  // Prevent re-applying the same active plan
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
    // Free has no recurring billing — clear the anniversary date so the cron skips this org.
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