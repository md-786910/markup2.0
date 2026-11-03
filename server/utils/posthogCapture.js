// Server-side product events for PostHog (the same project as the app,
// POSTHOG_KEY / POSTHOG_HOST). For people with no PostHog identity, e.g. guest
// reviewers: no person profile is created and nothing personal is sent, only
// ids. Fire-and-forget; a no-op without POSTHOG_KEY.
const axios = require('axios');

function captureServerEvent(event, { distinctId = 'server', organizationId = null, properties = {} } = {}) {
  const key = process.env.POSTHOG_KEY;
  if (!key) return;
  const host = (process.env.POSTHOG_HOST || 'https://eu.i.posthog.com').replace(/\/$/, '');
  axios.post(`${host}/capture/`, {
    api_key: key,
    event,
    distinct_id: distinctId,
    properties: {
      ...properties,
      $process_person_profile: false,
      ...(organizationId ? { $groups: { organization: String(organizationId) } } : {}),
    },
  }, { timeout: 3000 }).catch(() => {});
}

module.exports = { captureServerEvent };
