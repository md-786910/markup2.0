const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { supportLimiter } = require('../middleware/rateLimiters');
const { sendSupportRequest } = require('../utils/mailer');

// Public website contact form (no session). Emails the support inbox
// (SUPPORT_EMAIL, else the SMTP sender) with the sender as reply-to.
const TOPICS = ['Product support', 'Billing', 'Integrations', 'Security', 'Sales', 'Other'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function supportInbox() {
  const raw = process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || '';
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim();
}

router.post('/contact', supportLimiter, asyncHandler(async (req, res) => {
  const body = req.body || {};
  // Honeypot: real visitors never fill the hidden "website" field
  if (body.website) return res.json({ sent: true });

  const name = String(body.name || '').trim().slice(0, 100);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
  const topic = TOPICS.includes(body.topic) ? body.topic : 'Other';
  const message = String(body.message || '').trim();

  if (!name) return res.status(400).json({ message: 'Please enter your name.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });
  if (message.length < 10) return res.status(400).json({ message: 'Please add a few more details (at least 10 characters).' });
  if (message.length > 5000) return res.status(400).json({ message: 'Please keep your message under 5,000 characters.' });

  const inbox = supportInbox();
  if (!inbox) return res.status(503).json({ message: 'Support email is not configured. Please email us directly.' });

  try {
    await sendSupportRequest(inbox, { name, email, topic, message });
  } catch (err) {
    req.log.error({ err, smtpCode: err.code }, 'support request email failed to send');
    return res.status(502).json({ message: 'We could not send your message. Please email us directly.' });
  }
  res.status(201).json({ sent: true });
}));

module.exports = router;
