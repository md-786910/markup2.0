const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Admin panel sessions: their own signing key, so a customer token can never
// open the admin API and an admin token never works in the app. Shorter-lived
// than customer sessions.
const ADMIN_SESSION_TTL = process.env.ADMIN_SESSION_TTL || '12h';
const key = () => `${process.env.JWT_SECRET}:admin-session`;

const newSessionToken = () => crypto.randomBytes(32).toString('hex');

function signAdminToken(admin) {
  return jwt.sign({ id: String(admin._id), st: admin.sessionToken, kind: 'admin' }, key(), { expiresIn: ADMIN_SESSION_TTL, algorithm: 'HS256' });
}

// Decoded payload or null
function verifyAdminToken(token) {
  try {
    const decoded = jwt.verify(String(token || ''), key(), { algorithms: ['HS256'] });
    return decoded.kind === 'admin' ? decoded : null;
  } catch {
    return null;
  }
}

module.exports = { signAdminToken, verifyAdminToken, newSessionToken };
