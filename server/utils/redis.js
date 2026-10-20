const IORedis = require('ioredis');

// Optional Redis. When REDIS_URL is set, queues (BullMQ), rate limits and
// socket.io fan-out are shared through Redis so they survive restarts and work
// across several API instances. When it isn't set, those features fall back to
// in-process memory (single instance only).
const REDIS_URL = process.env.REDIS_URL || '';
const enabled = !!REDIS_URL;

const connections = [];

// Two connection styles:
// - default (BullMQ queues/workers, socket.io adapter): commands wait for Redis
//   to come back (BullMQ requires maxRetriesPerRequest: null). Background work.
// - failFast (request path: rate limits, email batching, health): commands error
//   within ~1s during an outage, so callers fall back instead of hanging requests.
function createConnection(name, { failFast = false } = {}) {
  if (!enabled) return null;
  const conn = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: failFast ? 1 : null,
    commandTimeout: failFast ? 1000 : undefined,
    enableReadyCheck: true,
    connectionName: `kommently:${name}`,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });
  let warned = false;
  conn.on('error', (err) => {
    // Log once per outage, not on every reconnect attempt
    if (!warned) console.error(`[redis:${name}] ${err.message}`);
    warned = true;
  });
  conn.on('ready', () => {
    if (warned) console.log(`[redis:${name}] reconnected`);
    warned = false;
  });
  connections.push(conn);
  return conn;
}

let shared = null;
// Shared fail-fast connection for request-path commands (rate limits, batching lists, locks).
function getRedis() {
  if (!enabled) return null;
  if (!shared) shared = createConnection('shared', { failFast: true });
  return shared;
}

async function pingRedis() {
  if (!enabled) return null;
  // Bound the wait even if the connection stalls without erroring
  const timeout = new Promise((resolve) => setTimeout(() => resolve(false), 1000).unref());
  try {
    return await Promise.race([getRedis().ping().then((r) => r === 'PONG'), timeout]);
  } catch {
    return false;
  }
}

async function closeRedis() {
  await Promise.all(connections.map((c) => c.quit().catch(() => c.disconnect())));
}

module.exports = { redisEnabled: enabled, getRedis, createConnection, pingRedis, closeRedis };
