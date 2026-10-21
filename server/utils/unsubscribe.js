const jwt = require('jsonwebtoken');
const { URLS } = require('../config/env');

// Signed, non-expiring links that turn off notification emails for one address.
// Billing and account emails (invitations, password resets, invoices) are
// transactional and are always sent.
const PURPOSE = 'unsubscribe';

function signUnsubscribeToken(email) {
  return jwt.sign({ purpose: PURPOSE, email: String(email).toLowerCase() }, process.env.JWT_SECRET, { algorithm: 'HS256' });
}

function verifyUnsubscribeToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    return decoded.purpose === PURPOSE ? decoded.email : null;
  } catch {
    return null;
  }
}

// Public URL of the API (the unsubscribe endpoint lives there)
function unsubscribeUrl(email) {
  const base = URLS.api;
  return `${base}/api/email/unsubscribe?token=${encodeURIComponent(signUnsubscribeToken(email))}`;
}

module.exports = { signUnsubscribeToken, verifyUnsubscribeToken, unsubscribeUrl };
