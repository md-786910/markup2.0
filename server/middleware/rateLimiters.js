const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisEnabled, getRedis } = require('../utils/redis');

const FIFTEEN_MIN = 15 * 60 * 1000;

// rate-limit-redis loads its Lua scripts once at startup and keeps a failed
// load forever, which would silently disable rate limiting if Redis was
// unreachable at boot. Reload the scripts whenever an earlier load failed.
class ResilientRedisStore extends RedisStore {
  async init(options) {
    return super.init(options).catch((err) => console.error(`[rate-limit] Redis store init failed, will retry: ${err.message}`));
  }

  async retryableIncrement(key) {
    try { await this.incrementScriptSha; } catch { this.incrementScriptSha = this.loadIncrementScript(); }
    return super.retryableIncrement(key);
  }

  async get(key) {
    try { await this.getScriptSha; } catch { this.getScriptSha = this.loadGetScript(); }
    return super.get(key);
  }
}

// During an outage ioredis is reconnecting/closed: fail at once instead of
// waiting for the command timeout (passOnStoreError lets the request through).
const OUTAGE_STATUSES = new Set(['reconnecting', 'close', 'end']);

// With Redis, counters are shared by all API instances and survive restarts.
// Without it, each process counts on its own (express-rate-limit memory store).
// Each limiter needs its own store/prefix.
function store(name) {
  if (!redisEnabled) return undefined;
  return new ResilientRedisStore({
    sendCommand: (...args) => {
      const redis = getRedis();
      if (OUTAGE_STATUSES.has(redis.status)) return Promise.reject(new Error('Redis unavailable'));
      return redis.call(...args);
    },
    prefix: `rl:${name}:`,
  });
}

// If Redis is unreachable, serve the request rather than failing the whole API.
const shared = { passOnStoreError: true };

// Burst limiter for credential-touching endpoints (login, signup, OTP, validate-email,
// forgot-password). skipSuccessfulRequests: true means a legit user typing their
// password right doesn't get penalized for previous typos.
const authLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
  store: store('auth'),
  ...shared,
});

// Admin tier — superadmin work involves bursts of list/edit calls in the panel.
const adminLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Rate limit exceeded.' },
  store: store('admin'),
  ...shared,
});

// Catch-all default for everything else.
const globalLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Rate limit exceeded.' },
  store: store('global'),
  ...shared,
});

// Per-email-address limits: the IP limiter above can't stop a distributed
// password guess against one account, or someone flooding a victim's inbox
// with reset / verification emails from many IPs.
function emailLimiter(name, windowMs, max, { skipSuccessfulRequests = false } = {}) {
  return rateLimit({
    windowMs,
    max,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    // Requests without an email fall back to the IP limiter only
    skip: (req) => typeof req.body?.email !== 'string' || !req.body.email.trim(),
    keyGenerator: (req) => req.body.email.trim().toLowerCase(),
    message: { message: 'Too many attempts for this email. Please wait and try again.' },
    store: store(`email-${name}`),
    ...shared,
  });
}

const loginEmailLimiter = emailLimiter('login', FIFTEEN_MIN, 10, { skipSuccessfulRequests: true });
const passwordResetEmailLimiter = emailLimiter('reset', 60 * 60 * 1000, 3);
const otpEmailLimiter = emailLimiter('otp', 60 * 60 * 1000, 6);

module.exports = {
  authLimiter,
  adminLimiter,
  globalLimiter,
  loginEmailLimiter,
  passwordResetEmailLimiter,
  otpEmailLimiter,
};
