const {
  sendPinNotificationEmail,
  sendCommentNotificationEmail,
  sendMentionNotificationEmail,
  sendPinStatusEmail,
  sendDigestEmail,
} = require('./mailer');
const { redisEnabled, getRedis, createConnection } = require('./redis');

const FLUSH_DELAY = parseInt(process.env.EMAIL_BATCH_DELAY_MS || '300000', 10); // default 5 minutes

// Events for the same recipient + project are grouped into one digest email,
// sent FLUSH_DELAY after the first event.
//
// With Redis (REDIS_URL): events are stored in a Redis list and a delayed BullMQ
// job sends the batch, so queued emails survive restarts and failed sends are
// retried with backoff. Without Redis: in-memory timers (lost on a crash).

// ── Delivery (shared) ───────────────────────────────────────────────────────

/**
 * Send one batch. Throws on send failure so the Redis path can retry; returns
 * quietly when the recipient muted the project.
 */
async function deliver(recipientEmail, events) {
  if (events.length === 0) return;

  const projectId = events[0].projectId;
  const User = require('../models/User');
  const user = await User.findOne({ email: recipientEmail.toLowerCase() }).select('mutedProjectEmails emailNotificationsEnabled');
  if (user && user.emailNotificationsEnabled === false) {
    return; // Unsubscribed from notification emails
  }
  if (projectId && user && user.mutedProjectEmails && user.mutedProjectEmails.some((p) => p.toString() === projectId.toString())) {
    return; // Muted by recipient
  }

  if (events.length === 1) {
    // Single event — send the original specific email (no digest wrapper)
    await sendSingleEmail(recipientEmail, events[0]);
  } else {
    // Multiple events — send digest
    const projectName = events[0].projectName;
    await sendDigestEmail(recipientEmail, projectName, events);
  }
}

/**
 * Send an individual email using the original mailer functions.
 */
async function sendSingleEmail(toEmail, event) {
  const extra = { pinNumber: event.pinNumber };
  switch (event.type) {
    case 'pin':
      await sendPinNotificationEmail(toEmail, event.actorName, event.projectName, event.pinPageUrl, event.link, extra);
      break;
    case 'comment':
      await sendCommentNotificationEmail(toEmail, event.actorName, event.projectName, event.commentBody, event.link, extra);
      break;
    case 'mention':
      await sendMentionNotificationEmail(toEmail, event.actorName, event.projectName, event.commentBody, event.link, extra);
      break;
    case 'status':
      await sendPinStatusEmail(toEmail, event.actorName, event.projectName, event.pinStatus, event.link, extra);
      break;
    default:
      console.warn(`Unknown email event type: ${event.type}`);
  }
}

// ── In-memory fallback ──────────────────────────────────────────────────────

// Map<"email::projectId", { events: [], timer: Timeout }>
const queue = new Map();

function queueInMemory(key, recipientEmail, event) {
  if (!queue.has(key)) {
    queue.set(key, { events: [], timer: null });
  }

  const bucket = queue.get(key);
  bucket.events.push(event);

  // Start flush timer on first event in this bucket
  if (!bucket.timer) {
    bucket.timer = setTimeout(() => flush(key, recipientEmail), FLUSH_DELAY);
  }
}

/**
 * Flush all queued in-memory events for a recipient+project into one email.
 */
async function flush(key, recipientEmail) {
  const bucket = queue.get(key);
  if (!bucket) return;
  queue.delete(key);

  try {
    await deliver(recipientEmail, bucket.events);
  } catch (err) {
    console.error(`Failed to send batched email to ${recipientEmail}:`, err.message);
  }
}

// ── Redis / BullMQ ──────────────────────────────────────────────────────────

const QUEUE_NAME = 'email-batches';
const EVENTS_TTL_SEC = 7 * 24 * 3600; // drop orphaned batches after a week
const LOCK_MS = 2 * 60 * 1000;
// First retry delay for a failed send; doubles each attempt (6 attempts ≈ 1 hour)
const RETRY_BASE_MS = parseInt(process.env.EMAIL_RETRY_BASE_MS || '60000', 10);

const eventsKey = (key) => `emailq:events:${key}`;
const schedKey = (key) => `emailq:sched:${key}`;
const lockKey = (key) => `emailq:lock:${key}`;

let bullQueue = null;
function getQueue() {
  if (!bullQueue) {
    const { Queue } = require('bullmq');
    bullQueue = new Queue(QUEUE_NAME, { connection: createConnection('email-queue') });
  }
  return bullQueue;
}

async function queueInRedis(key, recipientEmail, event) {
  const redis = getRedis();
  await redis.multi()
    .rpush(eventsKey(key), JSON.stringify(event))
    .expire(eventsKey(key), EVENTS_TTL_SEC)
    .exec();
  // First event of a batch schedules the send; later events just join the list
  const scheduled = await redis.set(schedKey(key), '1', 'PX', FLUSH_DELAY + 10 * 60 * 1000, 'NX');
  if (scheduled) {
    await getQueue().add('send-batch', { key, recipientEmail }, {
      delay: FLUSH_DELAY,
      attempts: 6,
      backoff: { type: 'exponential', delay: RETRY_BASE_MS },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }
}

// Worker: sends one batch. Events are trimmed only after a successful send, so a
// failed send keeps them for the retry; the lock stops two jobs sending the same batch.
async function processBatch(job) {
  const { key, recipientEmail } = job.data;
  const redis = getRedis();
  const token = `${job.id}:${job.attemptsMade}`;
  const locked = await redis.set(lockKey(key), token, 'PX', LOCK_MS, 'NX');
  if (!locked) throw new Error('batch is being sent by another job; retrying');

  try {
    // New events from now on schedule a fresh batch
    await redis.del(schedKey(key));
    const raw = await redis.lrange(eventsKey(key), 0, -1);
    if (raw.length === 0) return;
    await deliver(recipientEmail, raw.map((e) => JSON.parse(e)));
    await redis.ltrim(eventsKey(key), raw.length, -1);
  } finally {
    if ((await redis.get(lockKey(key))) === token) await redis.del(lockKey(key));
  }
}

let worker = null;
function startEmailWorker() {
  if (!redisEnabled || worker) return;
  const { Worker } = require('bullmq');
  worker = new Worker(QUEUE_NAME, processBatch, {
    connection: createConnection('email-worker'),
    concurrency: 5,
  });
  worker.on('failed', (job, err) => {
    const final = job && job.attemptsMade >= (job.opts.attempts || 1);
    console.error(`[email] batch for ${job?.data?.recipientEmail} failed${final ? ' permanently' : ', will retry'}: ${err.message}`);
    if (final) {
      try { require('../instrument').Sentry.captureException(err, { tags: { job: 'email-batch' } }); } catch {}
    }
  });
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Queue a notification event for batching. Fire-and-forget: if Redis is
 * unavailable the event falls back to the in-memory queue instead of being lost.
 */
function queueNotification(recipientEmail, event) {
  const key = `${recipientEmail}::${event.projectId}`;
  if (!redisEnabled) {
    queueInMemory(key, recipientEmail, event);
    return;
  }
  queueInRedis(key, recipientEmail, event).catch((err) => {
    console.error(`[email] Redis queue unavailable, using memory for ${recipientEmail}: ${err.message}`);
    queueInMemory(key, recipientEmail, event);
  });
}

/**
 * Shutdown: send in-memory batches now (they'd be lost otherwise) and let the
 * Redis worker finish its active jobs. Redis-queued batches persist.
 */
async function flushAll() {
  const pending = [...queue.entries()];
  await Promise.all(pending.map(([key, bucket]) => {
    clearTimeout(bucket.timer);
    return flush(key, key.split('::')[0]);
  }));
  if (worker) await worker.close();
  if (bullQueue) await bullQueue.close();
}

module.exports = { queueNotification, flushAll, startEmailWorker };
