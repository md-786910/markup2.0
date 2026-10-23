import posthog from 'posthog-js';

// Product analytics (PostHog). A no-op unless REACT_APP_POSTHOG_KEY is set at
// build time. Users are identified by id and organisation only (no email or
// name). Session replay (switched on in PostHog's project settings) masks all
// inputs and the comment editor; review sites run in a cross-origin frame and
// are not recorded.
const KEY = process.env.REACT_APP_POSTHOG_KEY;
const HOST = process.env.REACT_APP_POSTHOG_HOST || 'https://eu.i.posthog.com';

// Credentials in URLs: ?token=…, /reset-password/:token, /review/:shareToken
const SECRET_PARAMS = /([?&](?:token|password|share|key|code)=)[^&#\s]*/gi;
const SECRET_PATHS = /(\/(?:reset-password|review)\/)[^/?#\s]+/gi;

function redact(url) {
  return typeof url === 'string'
    ? url.replace(SECRET_PARAMS, '$1[redacted]').replace(SECRET_PATHS, '$1[redacted]')
    : url;
}

// URLs appear in many properties ($current_url, $session_entry_url, …):
// redact every string value (only credential patterns are changed)
function scrub(event) {
  if (!event) return event;
  for (const target of [event.properties, event.$set, event.$set_once]) {
    if (!target) continue;
    for (const key of Object.keys(target)) {
      if (typeof target[key] === 'string') target[key] = redact(target[key]);
    }
  }
  return event;
}

let enabled = false;

export function initAnalytics() {
  if (!KEY || enabled) return;
  posthog.init(KEY, {
    api_host: HOST,
    defaults: '2025-05-24',
    capture_pageview: 'history_change', // SPA route changes
    person_profiles: 'identified_only',
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '.ql-editor, [data-private]',
    },
    respect_dnt: true,
    before_send: scrub,
  });
  enabled = true;
}

// Signed in: link events to the user and their organisation; signed out: reset.
export function identifyUser(user) {
  if (!enabled) return;
  if (!user) {
    posthog.reset();
    return;
  }
  const id = String(user.id || user._id);
  posthog.identify(id, { role: user.role, plan: user.orgPlan || null });
  if (user.organization) {
    posthog.group('organization', String(user.organization), { name: user.orgName || undefined, plan: user.orgPlan || undefined });
  }
}

export function track(event, properties) {
  if (!enabled) return;
  try { posthog.capture(event, properties); } catch { /* analytics never breaks the app */ }
}
