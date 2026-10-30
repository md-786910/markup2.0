/**
 * Daily billing worker. Scheduled one of two ways (pick ONE):
 *   - In-process: BILLING_CRON_ENABLED=true (utils/scheduler.js). With REDIS_URL
 *     it runs once a day across all instances; without Redis, enable it on
 *     exactly one instance.
 *   - System cron / systemd timer:
 *       0 2 * * *  cd /app/server && npm run billing >> logs/billing.log 2>&1
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

require('../config/env');
const mongoose = require('mongoose');

const Organization = require('../models/Organization');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const PlanConfig = require('../models/PlanConfig');
const { getActiveProvider } = require('../payments');
const { getPlansWithOverrides, getLimitsForPlanAsync } = require('../config/plans');
const { URLS } = require('../config/env');
const {
  sendInvoiceCreatedEmail,
  sendPaymentReminderEmail,
  sendUrgentPaymentReminderEmail,
  sendOrgLockedEmail,
  sendTrialEndingEmail,
  sendTrialExpiredEmail,
} = require('../utils/mailer');
const { BILLING_LOCK_REASONS, clearBillingLock } = require('../utils/orgUtils');
const { addMonthsUTC } = require('../utils/billingDates');

const CLIENT_ORIGIN = URLS.app;
const PAY_URL = `${CLIENT_ORIGIN}/settings?tab=invoices`;
const PLAN_URL = `${CLIENT_ORIGIN}/settings?tab=billing`;

const PAID_PLANS = ['starter', 'pro']; // mirrors UPGRADEABLE_PLANS

const DAY_MS = 24 * 60 * 60 * 1000;
const GRACE_DAYS = 10; // dueAt = createdAt + 10 days; lock fires day 11+

function ymd(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS);
}

// Support requests of a purged organization, with their attachments
async function deleteSupportTickets(orgId) {
  const SupportTicket = require('../models/SupportTicket');
  const { deleteStoredFiles } = require('../utils/storage');
  const tickets = await SupportTicket.find({ organization: orgId }).select('messages.attachments').lean();
  deleteStoredFiles(tickets.flatMap((t) => t.messages.flatMap((m) => (m.attachments || []).map((a) => `uploads/documents/${a.filename}`))));
  await SupportTicket.deleteMany({ organization: orgId });
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
    // Cancelled subscriptions are not renewed (phaseCancellations ends them)
    'subscription.cancelAtPeriodEnd': { $ne: true },
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
    // addMonthsUTC clamps month-end dates (Jan 31 → Feb 28/29).
    const nextAnniversary = addMonthsUTC(cycleAnchor, 1);
    org.subscription.currentPeriodEnd = nextAnniversary;
    await org.save({ validateBeforeSave: false });

    console.log(
      `[billing] created invoice ${invoice._id} for org ${org._id} (${plan.name}, due ${dueAt.toISOString()}, ` +
      `next anniversary ${nextAnniversary.toISOString()})`
    );

    const owner = await ownerEmail(org._id);
    if (owner?.email) {
      await safeSend(`invoice-created→${owner.email}`, () =>
        sendInvoiceCreatedEmail(owner.email, org.name, plan.name, order.amount, dueAt, PAY_URL, order.currency)
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

    // The org has left paid billing (e.g. moved to free) since this invoice was
    // created: it no longer applies and must not trigger reminders or a lock.
    if (!PAID_PLANS.includes(org.plan)) {
      inv.status = 'void';
      await inv.save();
      console.log(`[billing] voided invoice ${inv._id} — org ${org._id} is now on ${org.plan}`);
      continue;
    }

    const owner = await ownerEmail(org._id);
    const email = owner?.email;

    let touched = false;

    // Day-4 reminder
    if (elapsed >= 4 && !inv.reminders.day4Sent) {
      if (email) await safeSend(`reminder-day4→${email}`, () =>
        sendPaymentReminderEmail(email, org.name, daysLeft, inv.amount, PAY_URL, inv.currency)
      );
      inv.reminders.day4Sent = true;
      touched = true;
    }

    // Day-7 reminder
    if (elapsed >= 7 && !inv.reminders.day7Sent) {
      if (email) await safeSend(`reminder-day7→${email}`, () =>
        sendPaymentReminderEmail(email, org.name, daysLeft, inv.amount, PAY_URL, inv.currency)
      );
      inv.reminders.day7Sent = true;
      touched = true;
    }

    // Day-9 urgent reminder
    if (elapsed >= 9 && !inv.reminders.day9Sent) {
      if (email) await safeSend(`reminder-day9→${email}`, () =>
        sendUrgentPaymentReminderEmail(email, org.name, daysLeft, inv.amount, PAY_URL, inv.currency)
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
        sendOrgLockedEmail(email, org.name, inv.amount, PAY_URL, inv.currency)
      );
      inv.reminders.lockSent = true;
      touched = true;
    }

    if (touched) await inv.save();
  }
}

/**
 * Daily — trial orgs: "choose a plan" emails 7, 3 and 1 day(s) before the trial
 * ends, then lock at expiry with an email. Each email is sent once (flags on
 * org.trialReminders). The lock itself mirrors checkTrialExpiry, which also
 * locks lazily on the next request.
 */
async function phaseTrials() {
  const now = new Date();
  const horizon = new Date(now.getTime() + 8 * DAY_MS);
  const orgs = await Organization.find({
    plan: 'trial',
    trialEndsAt: { $ne: null, $lte: horizon },
    'trialReminders.expiredSent': { $ne: true },
  });
  console.log(`[billing] trials: ${orgs.length} trial org(s) ending within 8 days or expired`);

  for (const org of orgs) {
    // Manual admin locks are left alone
    if (org.isLocked && org.lockedReason && !BILLING_LOCK_REASONS.has(org.lockedReason)) continue;

    const endsAt = new Date(org.trialEndsAt);
    const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS);
    const owner = await ownerEmail(org._id);
    const email = owner?.email;
    if (!org.trialReminders) org.trialReminders = {};
    let touched = false;

    if (daysLeft <= 0) {
      if (!org.isLocked) {
        org.isLocked = true;
        org.lockedAt = now;
        org.lockedReason = 'Trial expired';
        console.log(`[billing] LOCKED org ${org._id} — trial expired`);
      }
      if (email) await safeSend(`trial-expired→${email}`, () => sendTrialExpiredEmail(email, org.name, PLAN_URL));
      org.trialReminders.expiredSent = true;
      touched = true;
    } else {
      // Send only the most urgent reminder that is due, once
      const due = [[1, 'day1Sent'], [3, 'day3Sent'], [7, 'day7Sent']].find(([d]) => daysLeft <= d);
      if (due && !org.trialReminders[due[1]]) {
        if (email) await safeSend(`trial-ending-${due[0]}→${email}`, () => sendTrialEndingEmail(email, org.name, daysLeft, endsAt, PLAN_URL));
        // Mark this and any less urgent reminders as sent so they don't follow later
        for (const [d, flag] of [[1, 'day1Sent'], [3, 'day3Sent'], [7, 'day7Sent']]) {
          if (d >= due[0]) org.trialReminders[flag] = true;
        }
        touched = true;
      }
    }

    if (touched) await org.save({ validateBeforeSave: false });
  }
}

/**
 * Daily — cancelled subscriptions whose paid period has ended move to free.
 */
async function phaseCancellations() {
  const orgs = await Organization.find({
    plan: { $in: PAID_PLANS },
    'subscription.cancelAtPeriodEnd': true,
    'subscription.currentPeriodEnd': { $lte: new Date() },
  });
  for (const org of orgs) {
    const previousPlan = org.plan;
    org.plan = 'free';
    org.limits = await getLimitsForPlanAsync('free');
    org.subscription.status = 'canceled';
    org.subscription.currentPeriodEnd = null;
    org.subscription.cancelAtPeriodEnd = false;
    clearBillingLock(org);
    await org.save({ validateBeforeSave: false });
    await Invoice.updateMany({ organization: org._id, status: 'pending' }, { $set: { status: 'void' } });
    console.log(`[billing] org ${org._id} moved ${previousPlan} → free (cancelled, period ended)`);
  }
}

/**
 * Daily — permanently delete organizations whose deletion grace period is over.
 * Invoices are kept: they are the seller's tax records (with the buyer details
 * frozen on them), not workspace content.
 */
async function phaseOrgDeletion() {
  const Project = require('../models/Project');
  const Invitation = require('../models/Invitation');
  const Integration = require('../models/Integration');
  const Activity = require('../models/Activity');
  const Notification = require('../models/Notification');
  const { deleteProjectCascade } = require('../utils/cascade');
  const { deleteStoredFiles } = require('../utils/storage');

  const orgs = await Organization.find({ deletionScheduledAt: { $ne: null, $lte: new Date() } });
  for (const org of orgs) {
    const projects = await Project.find({ organization: org._id });
    for (const project of projects) await deleteProjectCascade(project);

    const users = await User.find({ organization: org._id }).select('_id avatar');
    const userIds = users.map((u) => u._id);
    deleteStoredFiles(users.filter((u) => u.avatar).map((u) => `uploads/${u.avatar}`));
    if (org.logo) deleteStoredFiles([`uploads/${org.logo}`]);

    await Promise.all([
      Notification.deleteMany({ recipient: { $in: userIds } }),
      Invitation.deleteMany({ organization: org._id }),
      Integration.deleteMany({ organization: org._id }),
      // The admin action log about this organization stays (audit trail)
      Activity.deleteMany({ organization: org._id, 'metadata.actorRole': { $ne: 'superadmin' } }),
      require('../models/Workspace').deleteMany({ organization: org._id }),
      require('../models/AdminNote').deleteMany({ organization: org._id }),
      deleteSupportTickets(org._id),
      Project.updateMany({ members: { $in: userIds } }, { $pull: { members: { $in: userIds } } }),
    ]);
    await User.deleteMany({ _id: { $in: userIds } });
    await Organization.deleteOne({ _id: org._id });
    console.log(`[billing] deleted organization ${org._id} (${projects.length} projects, ${userIds.length} users)`);
  }
}

// Retention: notifications 180 days, activity 365 days (not the admin action
// log, which is the audit trail), invitations 30 days past expiry
const RETENTION = { notificationsDays: 180, activityDays: 365, expiredInvitationDays: 30 };

async function phaseRetention() {
  const Activity = require('../models/Activity');
  const Notification = require('../models/Notification');
  const Invitation = require('../models/Invitation');
  const ago = (days) => new Date(Date.now() - days * DAY_MS);
  const [n, a, i] = await Promise.all([
    Notification.deleteMany({ createdAt: { $lt: ago(RETENTION.notificationsDays) } }),
    Activity.deleteMany({ createdAt: { $lt: ago(RETENTION.activityDays) }, 'metadata.actorRole': { $ne: 'superadmin' } }),
    Invitation.deleteMany({ expiresAt: { $lt: ago(RETENTION.expiredInvitationDays) } }),
  ]);
  console.log(`[billing] retention: removed ${n.deletedCount} notifications, ${a.deletedCount} activity entries, ${i.deletedCount} invitations`);
}

// Guards against overlapping runs in the same process (in-process scheduler).
let running = false;

// Runs both phases against the current mongoose connection.
async function runBilling() {
  if (running) {
    console.log('[billing] previous run still in progress — skipping');
    return;
  }
  running = true;
  try {
    // No calendar gate — every paid org has its own anniversary anchored to
    // subscription.currentPeriodEnd. The phase below skips orgs whose anniversary
    // hasn't arrived yet via its query filter.
    await phaseGenerateAnniversary();

    await phaseCancellations();

    await phaseProcessPending();

    await phaseTrials();

    await phaseOrgDeletion();

    await phaseRetention();
    try {
      const { computeHealthForAllOrgs } = require('../utils/customerHealth');
      const healthSummary = await computeHealthForAllOrgs();
      console.log('[billing] updated customer health:', healthSummary);
    } catch (err) {
      console.error('[billing] customer health update failed:', err.message);
    }
    console.log('[billing] done');
  } finally {
    running = false;
  }
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('[billing] MONGODB_URI not set');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[billing] connected to MongoDB');

  await runBilling();

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[billing] fatal:', err);
    process.exit(1);
  });
}

module.exports = { runBilling, phaseRetention };
