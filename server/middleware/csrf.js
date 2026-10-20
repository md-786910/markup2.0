const crypto = require('crypto');

const CSRF_COOKIE = 'markup_csrf';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// 32 random bytes hex — same shape as auth.controller.js generateSessionToken.
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Constant-time string compare to dodge timing oracles.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Double-submit verifier. Mutating requests must echo the markup_csrf cookie
// in an X-CSRF-Token header. Header-auth (Bearer) requests bypass — they're
// not CSRF-able by browser-driven cross-site requests.
function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) return next();

  const cookieToken = req.cookies && req.cookies[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];

  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return res.status(403).json({ message: 'CSRF token missing or invalid' });
  }
  next();
}

module.exports = { verifyCsrf, generateCsrfToken, CSRF_COOKIE };
