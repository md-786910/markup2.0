import * as Sentry from '@sentry/react';

// Error monitoring. A no-op unless REACT_APP_SENTRY_DSN is set at build time.
const SECRET_PARAMS = /([?&](?:token|password|share|key)=)[^&#\s]*/gi;
// Path segments that are credentials: /reset-password/:token, /review/:shareToken
const SECRET_PATHS = /(\/(?:reset-password|review)\/)[^/?#\s]+/gi;

function redact(url) {
  return typeof url === 'string'
    ? url.replace(SECRET_PARAMS, '$1[redacted]').replace(SECRET_PATHS, '$1[redacted]')
    : url;
}

function scrub(event) {
  if (event.request) {
    event.request.url = redact(event.request.url);
    if (event.request.headers) delete event.request.headers.Referer;
  }
  if (event.breadcrumbs) {
    event.breadcrumbs.forEach((b) => {
      if (b.data) {
        if (b.data.url) b.data.url = redact(b.data.url);
        if (b.data.from) b.data.from = redact(b.data.from);
        if (b.data.to) b.data.to = redact(b.data.to);
      }
      if (b.message) b.message = redact(b.message);
    });
  }
  if (event.transaction) event.transaction = redact(event.transaction);
  return event;
}

export function initSentry() {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.REACT_APP_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    release: process.env.REACT_APP_SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    beforeSend: scrub,
    beforeBreadcrumb: (breadcrumb) => {
      if (breadcrumb.data?.url) breadcrumb.data.url = redact(breadcrumb.data.url);
      return breadcrumb;
    },
  });
}

// Tag errors with the signed-in user's id (no email/name) so issues can be grouped per user.
export function setSentryUser(user) {
  if (!process.env.REACT_APP_SENTRY_DSN) return;
  Sentry.setUser(user ? { id: user.id || user._id } : null);
}

export { Sentry };
