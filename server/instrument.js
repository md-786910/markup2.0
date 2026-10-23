// Sentry error monitoring. Must be required before any other module (see server.js)
// so its auto-instrumentation can hook Express, HTTP and MongoDB. A no-op unless
// SENTRY_DSN is set.
const Sentry = require('@sentry/node');

const SECRET_PARAMS = /([?&](?:token|rt|password|share|key|code|otp)=)[^&#\s]*/gi;
// Path segments that are credentials: share links, invitations, password resets
const SECRET_PATHS = /(\/api\/(?:guest|invitations|auth\/reset-password)\/)[^/?#\s]+/gi;
const SECRET_HEADERS = ['authorization', 'cookie', 'x-csrf-token', 'x-guest-access'];

function redactUrl(url) {
  return typeof url === 'string'
    ? url.replace(SECRET_PARAMS, '$1[redacted]').replace(SECRET_PATHS, '$1[redacted]')
    : url;
}

// Strip credentials before anything leaves the server: session/proxy JWTs travel
// in ?token=, share passwords in ?password=, and auth in headers/cookies.
function scrub(event) {
  const req = event.request;
  if (req) {
    delete req.cookies;
    delete req.data;
    if (req.headers) {
      for (const h of Object.keys(req.headers)) {
        if (SECRET_HEADERS.includes(h.toLowerCase())) req.headers[h] = '[redacted]';
      }
    }
    req.url = redactUrl(req.url);
    if (typeof req.query_string === 'string') req.query_string = redactUrl(`?${req.query_string}`).slice(1);
    else if (req.query_string && typeof req.query_string === 'object') {
      for (const k of Object.keys(req.query_string)) {
        if (/^(token|rt|password|share|key|code|otp)$/i.test(k)) req.query_string[k] = '[redacted]';
      }
    }
  }
  if (event.breadcrumbs) {
    for (const b of event.breadcrumbs) {
      if (b.data && b.data.url) b.data.url = redactUrl(b.data.url);
      if (b.message) b.message = redactUrl(b.message);
    }
  }
  if (event.transaction) event.transaction = redactUrl(event.transaction);
  return event;
}

// Tracing spans (when SENTRY_TRACES_SAMPLE_RATE > 0) carry request URLs too
function scrubSpan(span) {
  if (span.description) span.description = redactUrl(span.description);
  if (span.name) span.name = redactUrl(span.name);
  const attrs = span.attributes || span.data;
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      if (typeof attrs[k] === 'string') attrs[k] = redactUrl(attrs[k]);
    }
  }
  return span;
}

// Settings (all optional; nothing is sent without SENTRY_DSN):
//   SENTRY_TRACES_SAMPLE_RATE   share of requests traced (0 = off)
//   SENTRY_PROFILE_SAMPLE_RATE  share of sessions profiled; profiles traced requests
//   SENTRY_LOG_LEVEL            lowest app log level sent to Sentry Logs (default warn)
const rate = (name) => Math.min(Math.max(parseFloat(process.env[name] || '0') || 0, 0), 1);
const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

function integrations() {
  const list = [];
  const minLevel = LOG_LEVELS.indexOf(process.env.SENTRY_LOG_LEVEL || 'warn');
  // Our pino logs (request lines, warnings, errors) go to Sentry Logs
  list.push(Sentry.pinoIntegration({ log: { levels: LOG_LEVELS.slice(minLevel < 0 ? 3 : minLevel) } }));
  if (rate('SENTRY_PROFILE_SAMPLE_RATE') > 0) {
    try {
      list.push(require('@sentry/profiling-node').nodeProfilingIntegration());
    } catch (err) {
      console.warn('[sentry] profiling unavailable:', err.message);
    }
  }
  return list;
}

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || undefined,
    integrations: integrations(),
    tracesSampleRate: rate('SENTRY_TRACES_SAMPLE_RATE'),
    profileSessionSampleRate: rate('SENTRY_PROFILE_SAMPLE_RATE'),
    profileLifecycle: 'trace',
    sendDefaultPii: false,
    beforeSend: scrub,
    beforeSendSpan: scrubSpan,
    beforeSendLog: (log) => ({ ...log, message: redactUrl(String(log.message)) }),
  });
}

// Product metrics (Sentry Metrics); a no-op without SENTRY_DSN.
//   metric('pin.created', { source: 'guest' })
function metric(name, attributes) {
  if (!process.env.SENTRY_DSN) return;
  try { Sentry.metrics.count(name, 1, attributes ? { attributes } : undefined); } catch { /* never break a request */ }
}

module.exports = { Sentry, sentryEnabled: !!process.env.SENTRY_DSN, scrub, metric };
