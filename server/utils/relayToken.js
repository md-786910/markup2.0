const crypto = require('crypto');

// Token that lets browsers use the Cloudflare relay (cloudflare-relay/worker.js)
// for proxied pages. Without it the relay is an open proxy anyone can burn the
// quota of. Format: "<expiry unix seconds>.<hex HMAC-SHA256('relay:<expiry>')>"
// with RELAY_SECRET, which the worker shares. Not bound to a URL because the
// injected script builds relay URLs in the browser.
const TTL_SECONDS = 24 * 60 * 60;
// Reuse one token per hour so rewritten CSS/JS stays cacheable
const ROTATE_SECONDS = 60 * 60;

let cached = { token: '', bucket: -1 };

function relayToken() {
  const secret = process.env.RELAY_SECRET;
  if (!secret) return '';
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / ROTATE_SECONDS);
  if (cached.bucket !== bucket) {
    const exp = (bucket + 1) * ROTATE_SECONDS + TTL_SECONDS;
    const sig = crypto.createHmac('sha256', secret).update(`relay:${exp}`).digest('hex');
    cached = { token: `${exp}.${sig}`, bucket };
  }
  return cached.token;
}

// Query suffix to append after "?url=..." on relay URLs ('' when no secret is set)
function relayQuery() {
  const token = relayToken();
  return token ? `&rt=${encodeURIComponent(token)}` : '';
}

module.exports = { relayToken, relayQuery };
