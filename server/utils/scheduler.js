const { redisEnabled, createConnection } = require('./redis');

// Daily billing/trial job (scripts/runBilling.js), enabled with BILLING_CRON_ENABLED=true.
//
// With Redis: a BullMQ job scheduler runs it once per day across all instances
// (safe to enable everywhere), retries a failed run, and a run that was due
// while the server was down executes as soon as a worker is back.
// Without Redis: a timer in this process — enable on exactly ONE instance.
const BILLING_PATTERN = process.env.BILLING_CRON || '0 2 * * *'; // 02:00 UTC

let queue = null;
let worker = null;
let timers = [];

function reportFailure(err) {
  console.error('[billing] run failed:', err);
  try { require('../instrument').Sentry.captureException(err, { tags: { job: 'billing' } }); } catch {}
}

async function startBillingScheduler() {
  if (process.env.BILLING_CRON_ENABLED !== 'true') return;
  const { runBilling } = require('../scripts/runBilling');

  if (!redisEnabled) {
    const runSafely = () => runBilling().catch(reportFailure);
    timers.push(setTimeout(runSafely, 60 * 1000).unref());
    timers.push(setInterval(runSafely, 24 * 60 * 60 * 1000).unref());
    console.log('[billing] in-process daily billing enabled (no Redis: run on one instance only)');
    return;
  }

  const { Queue, Worker } = require('bullmq');
  queue = new Queue('billing', { connection: createConnection('billing-queue') });
  await queue.upsertJobScheduler(
    'daily-billing',
    { pattern: BILLING_PATTERN, tz: 'UTC' },
    {
      name: 'run-billing',
      opts: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5 * 60 * 1000 },
        removeOnComplete: 30,
        removeOnFail: 100,
      },
    },
  );
  worker = new Worker('billing', () => runBilling(), {
    connection: createConnection('billing-worker'),
    concurrency: 1,
  });
  worker.on('failed', (job, err) => reportFailure(err));
  console.log(`[billing] daily billing scheduled via Redis (${BILLING_PATTERN} UTC)`);
}

async function stopBillingScheduler() {
  timers.forEach((t) => clearTimeout(t));
  timers = [];
  if (worker) await worker.close();
  if (queue) await queue.close();
}

module.exports = { startBillingScheduler, stopBillingScheduler };
