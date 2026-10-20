// Sentry error monitoring. Must be required before any other module (see server.js)
// so its auto-instrumentation can hook Express, HTTP and MongoDB. A no-op unless
// SENTRY_DSN is set.
const Sentry = require('@sentry/node');

const SECRET_PARAMS = /([?&](?:token|password|share|key)=)[^&#\s]*/gi;
const SECRET_HEADERS = ['authorization', 'cookie', 'x-csrf-token', 'x-guest-access'];

function redactUrl(url) {
  return typeof url === 'string' ? url.replace(SECRET_PARAMS, '$1[redacted]') : url;
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
        if (/^(token|password|share|key)$/i.test(k)) req.query_string[k] = '[redacted]';
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

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || undefined,
    // Performance tracing is off unless a sample rate is configured
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0'),
    sendDefaultPii: false,
    beforeSend: scrub,
    beforeSendSpan: scrubSpan,
  });
}

module.exports = { Sentry, sentryEnabled: !!process.env.SENTRY_DSN, scrub };
