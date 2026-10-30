const http = require('http');
const https = require('https');

// PostHog HogQL query helper for the admin panel.
// A no-op returning { available: false } when unconfigured or on any API error.

const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const HOST = (process.env.POSTHOG_HOST || 'https://eu.i.posthog.com').replace(/\/$/, '');

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const TIMEOUT_MS = 5000;             // 5 seconds max

// In-memory cache fallback: key -> { at, data }
const memoryCache = new Map();

function getCached(key) {
  const hit = memoryCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.data;
  }
  return null;
}

function setCached(key, data) {
  if (memoryCache.size > 2000) memoryCache.clear();
  memoryCache.set(key, { at: Date.now(), data });
}

/**
 * Execute a HogQL query against PostHog Query API.
 * Never throws — on failure returns null.
 */
async function queryHogQL(queryStr) {
  if (!API_KEY || !PROJECT_ID) return null;

  return new Promise((resolve) => {
    try {
      const url = new URL(`${HOST}/api/projects/${PROJECT_ID}/query/`);
      const body = JSON.stringify({
        query: {
          kind: 'HogQLQuery',
          query: queryStr,
        },
      });

      const req = (url.protocol === 'https:' ? https : http).request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: TIMEOUT_MS,
        },
        (res) => {
          let chunks = '';
          res.on('data', (d) => (chunks += d));
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsed = JSON.parse(chunks);
                resolve(parsed.results || []);
              } catch (_) {
                resolve(null);
              }
            } else {
              resolve(null);
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });

      req.on('error', () => resolve(null));
      req.write(body);
      req.end();
    } catch (_) {
      resolve(null);
    }
  });
}

/**
 * Fetch 30-day PostHog metrics for an organization (group key: organization).
 * Returns { available: boolean, ...metrics }
 */
async function getOrgPosthogData(orgId) {
  if (!API_KEY || !PROJECT_ID || !orgId) {
    return { available: false, reason: 'unconfigured' };
  }

  const cacheKey = `ph:org:${orgId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const orgKey = String(orgId).replace(/'/g, "\\'");

    // Query 1: 30-day session count and total duration
    // PostHog captures $session_id and session duration if session recording or tracking is enabled
    const sessionQuery = `
      SELECT
        count(distinct $session_id) as sessions,
        count(distinct distinct_id) as active_users
      FROM events
      WHERE timestamp >= now() - INTERVAL 30 DAY
        AND $group_0 = '${orgKey}'
    `;

    // Query 2: Top visited pages
    const pagesQuery = `
      SELECT
        properties.$current_url as url,
        count() as views
      FROM events
      WHERE timestamp >= now() - INTERVAL 30 DAY
        AND $group_0 = '${orgKey}'
        AND event = '$pageview'
      GROUP BY url
      ORDER BY views DESC
      LIMIT 5
    `;

    // Query 3: Top event names
    const eventsQuery = `
      SELECT
        event,
        count() as count
      FROM events
      WHERE timestamp >= now() - INTERVAL 30 DAY
        AND $group_0 = '${orgKey}'
      GROUP BY event
      ORDER BY count DESC
      LIMIT 8
    `;

    const [sessionResults, pageResults, eventResults] = await Promise.all([
      queryHogQL(sessionQuery),
      queryHogQL(pagesQuery),
      queryHogQL(eventsQuery),
    ]);

    if (!sessionResults && !pageResults && !eventResults) {
      return { available: false, reason: 'query_failed' };
    }

    const sessions = sessionResults?.[0]?.[0] || 0;
    const activeUsers30d = sessionResults?.[0]?.[1] || 0;
    const topPages = (pageResults || []).map((row) => ({ url: row[0], views: row[1] }));
    const topEvents = (eventResults || []).map((row) => ({ event: row[0], count: row[1] }));

    const data = {
      available: true,
      sessions,
      activeUsers30d,
      topPages,
      topEvents,
    };

    setCached(cacheKey, data);
    return data;
  } catch (_) {
    return { available: false, reason: 'exception' };
  }
}

/**
 * Fetch 30-day PostHog metrics for an individual user.
 */
async function getUserPosthogData(userId) {
  if (!API_KEY || !PROJECT_ID || !userId) {
    return { available: false, reason: 'unconfigured' };
  }

  const cacheKey = `ph:user:${userId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const userKey = String(userId).replace(/'/g, "\\'");
    const query = `
      SELECT
        max(timestamp) as last_seen,
        count(distinct $session_id) as sessions,
        count() as total_events
      FROM events
      WHERE timestamp >= now() - INTERVAL 30 DAY
        AND distinct_id = '${userKey}'
    `;

    const results = await queryHogQL(query);
    if (!results || !results.length) {
      return { available: false, reason: 'query_failed' };
    }

    const data = {
      available: true,
      lastSeen: results[0][0] || null,
      sessions: results[0][1] || 0,
      totalEvents: results[0][2] || 0,
    };

    setCached(cacheKey, data);
    return data;
  } catch (_) {
    return { available: false, reason: 'exception' };
  }
}

module.exports = {
  getOrgPosthogData,
  getUserPosthogData,
};

