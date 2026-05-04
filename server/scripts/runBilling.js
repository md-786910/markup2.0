/**
 * Daily billing worker — run via system cron / systemd timer.
 *
 * Suggested crontab (server-local):
 *   0 2 * * *  cd /app/server && node scripts/runBilling.js >> logs/billing.log 2>&1
 *
 * Two phases (both run every day):
 *   1. phaseGenerateAnniversary — finds paid orgs whose
 *      `subscription.currentPeriodEnd` has arrived (≤ now). For each, creates
 *      an Invoice + Razorpay Order, sends the day-0 invoice email, and advances
 *      `currentPeriodEnd` by one month so the org's next anniversary is set.
 *   2. phaseProcessPending — for each pending auto-billing invoice: sends
 *      day 4 / 7 / 9 reminders (idempotent), and at day ≥ 11 locks the org
 *      and sends the lock email.
 *
 * The script is safe to re-run — every email send is gated by a `reminders.*Sent`
 * flag, the partial-unique index on (organization, billingMonth) prevents
 * duplicate monthly invoices, and the anniversary phase advances
 * `currentPeriodEnd` after creation so the same org isn't re-billed on subsequent
 * runs until the *next* anniversary.
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

const Organization = require('../models/Organization');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const PlanConfig = require('../models/PlanConfig');
const { getActiveProvider } = require('../payments');
const { getPlansWithOverrides } = require('../config/plans');
const {
  sendInvoiceCreatedEmail,
  sendPaymentReminderEmail,
  sendUrgentPaymentReminderEmail,
  sendOrgLockedEmail,
} = require('../utils/mailer');
const { BILLING_LOCK_REASONS } = require('../utils/orgUtils');

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
const PAY_URL = `${CLIENT_ORIGIN}/settings?tab=invoices`;

const PAID_PLANS = ['starter', 'pro']; // mirrors UPGRADEABLE_PLANS

const DAY_MS = 24 * 60 * 60 * 1000;
const GRACE_DAYS = 10; // dueAt = createdAt + 10 days; lock fires day 11+

function ymd(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS);
}

async function safeSend(label, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`[billing] ${label} failed:`, err.message);
  }
}

async function ownerEmail(orgId) {
  const owner = await User.findOne({ organization: orgId, role: 'owner' }).select('email name');
  return owner;
}

/**
 * Each org has its own monthly anniversary anchored to subscription.currentPeriodEnd
 * (set initially by verifyPayment / upgradePlan to upgrade-day + 1 month).
 *
 * Every day this phase finds orgs whose anniversary has arrived (currentPeriodEnd ≤ now),
 * generates one invoice + Razorpay order, advances currentPeriodEnd by one month so the
 * cycle naturally schedules itself, and emails the owner.
 *
 * Idempotency: the partial-unique index on (organization, billingMonth) prevents a
 * duplicate insert if the cron runs twice the same day, and advancing currentPeriodEnd
 * before saving means subsequent same-day runs skip the org via the query filter.
 */
async function phaseGenerateAnniversary() {
  const now = new Date();
  const cutoff = new Date(now.getTime() + DAY_MS); // include orgs due within the next 24h

  const merged = await getPlansWithOverrides();

  const provider = await getActiveProvider();
  if (!provider) {
    console.warn('[billing] no active payment provider — skipping anniversary generation.');
    return;
  }

  const orgs = await Organization.find({
    plan: { $in: PAID_PLANS },
    'subscription.currentPeriodEnd': { $ne: null, $lte: cutoff },
  });
  console.log(
    `[billing] generate-anniversary: ${orgs.length} paid org(s) at/past anniversary (provider: ${provider.id})`
  );

  for (const org of orgs) {
    // Skip orgs locked for non-billing reasons (admin lock etc.)
    if (org.isLocked && org.lockedReason && !BILLING_LOCK_REASONS.has(org.lockedReason)) {
      console.log(`[billing] skip ${org._id} — locked: ${org.lockedReason}`);
      continue;
    }

    const plan = merged[org.plan];
    if (!plan || plan.price == null) {
      console.warn(`[billing] skip ${org._id} — no price for plan ${org.plan}`);
      continue;
    }

    // The anniversary's calendar month identifies this billing cycle. Two orgs
    // can share the same billingMonth string — the unique index is per-org.
    const cycleAnchor = new Date(org.subscription.currentPeriodEnd);
    const billingMonth = ymd(cycleAnchor);

    // Idempotent: partial-unique index also rejects a duplicate insert
    const existing = await Invoice.findOne({ organization: org._id, billingMonth });
    if (existing) {
      console.log(`[billing] skip ${org._id} — invoice already exists for ${billingMonth}`);
      continue;
    }

    let order;
    try {
      order = await provider.createOrder({
        org,
        plan: org.plan,
        planConfig: plan,
        invoiceMeta: {
          receipt: `auto_${org._id}_${billingMonth}`.slice(0, 40),
          billingMonth,
        },
      });
    } catch (err) {
      console.error(`[billing] ${provider.id} order failed for ${org._id}:`, err.message);
      continue;
    }

    const dueAt = new Date(Date.now() + GRACE_DAYS * DAY_MS);

    const invoiceDoc = {
      organization: org._id,
      plan: org.plan,
      amount: order.amount,
      currency: order.currency,
      status: 'pending',
      provider: provider.id,
      billingMonth,
      dueAt,
      reminders: { day0Sent: true, day4Sent: false, day7Sent: false, day9Sent: false, lockSent: false },
    };
    if (provider.id === 'razorpay') invoiceDoc.razorpayOrderId = order.providerOrderId;
    if (provider.id === 'paypal') invoiceDoc.paypalOrderId = order.providerOrderId;

    const invoice = await Invoice.create(invoiceDoc);

    // Advance the anniversary by one month so this org isn't re-billed tomorrow.
    // setMonth handles month-overflow correctly (Jan 31 → Feb 28/29).
    const nextAnniversary = new Date(cycleAnchor);
    nextAnniversary.setMonth(nextAnniversary.getMonth() + 1);
    org.subscription.currentPeriodEnd = nextAnniversary;
    await org.save({ validateBeforeSave: false });

    console.log(
      `[billing] created invoice ${invoice._id} for org ${org._id} (${plan.name}, due ${dueAt.toISOString()}, ` +
      `next anniversary ${nextAnniversary.toISOString()})`
    );

    const owner = await ownerEmail(org._id);
    if (owner?.email) {
      await safeSend(`invoice-created→${owner.email}`, () =>
        sendInvoiceCreatedEmail(owner.email, org.name, plan.name, order.amount, dueAt, PAY_URL)
      );
    }
  }
}

/**
 * Daily — process every pending auto-billing invoice: reminders + lock.
 */
async function phaseProcessPending() {
  const pending = await Invoice.find({
    status: 'pending',
    billingMonth: { $type: 'string' },
    dueAt: { $ne: null },
  });

  console.log(`[billing] process-pending: ${pending.length} pending invoice(s)`);

  for (const inv of pending) {
    const elapsed = daysSince(inv.createdAt);
    const dueAt = new Date(inv.dueAt);
    const daysLeft = Math.max(0, Math.ceil((dueAt.getTime() - Date.now()) / DAY_MS));

    const org = await Organization.findById(inv.organization);
    if (!org) continue;

    const owner = await ownerEmail(org._id);
    const email = owner?.email;

    let touched = false;

    // Day-4 reminder
    if (elapsed >= 4 && !inv.reminders.day4Sent) {
      if (email) await safeSend(`reminder-day4→${email}`, () =>
        sendPaymentReminderEmail(email, org.name, daysLeft, inv.amount, PAY_URL)
      );
      inv.reminders.day4Sent = true;
      touched = true;
    }

    // Day-7 reminder
    if (elapsed >= 7 && !inv.reminders.day7Sent) {
      if (email) await safeSend(`reminder-day7→${email}`, () =>
        sendPaymentReminderEmail(email, org.name, daysLeft, inv.amount, PAY_URL)
      );
      inv.reminders.day7Sent = true;
      touched = true;
    }

    // Day-9 urgent reminder
    if (elapsed >= 9 && !inv.reminders.day9Sent) {
      if (email) await safeSend(`reminder-day9→${email}`, () =>
        sendUrgentPaymentReminderEmail(email, org.name, daysLeft, inv.amount, PAY_URL)
      );
      inv.reminders.day9Sent = true;
      touched = true;
    }

    // Day-11+ lock
    if (Date.now() >= dueAt.getTime() && !inv.reminders.lockSent) {
      if (!org.isLocked) {
        org.isLocked = true;
        org.lockedAt = new Date();
        org.lockedReason = 'Payment overdue';
        if (!org.subscription) org.subscription = {};
        org.subscription.status = 'past_due';
        await org.save({ validateBeforeSave: false });
        console.log(`[billing] LOCKED org ${org._id} for invoice ${inv._id}`);
      }
      if (email) await safeSend(`org-locked→${email}`, () =>
        sendOrgLockedEmail(email, org.name, inv.amount, PAY_URL)
      );
      inv.reminders.lockSent = true;
      touched = true;
    }

    if (touched) await inv.save();
  }
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('[billing] MONGODB_URI not set');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[billing] connected to MongoDB');

  // No calendar gate — every paid org has its own anniversary anchored to
  // subscription.currentPeriodEnd. The phase below skips orgs whose anniversary
  // hasn't arrived yet via its query filter.
  await phaseGenerateAnniversary();

  await phaseProcessPending();

  await mongoose.disconnect();
  console.log('[billing] done');
}

main().catch((err) => {
  console.error('[billing] fatal:', err);
  process.exit(1);
});
