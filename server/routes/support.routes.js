const router = require('express').Router();
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const { supportLimiter, supportTicketLimiter, supportReplyLimiter } = require('../middleware/rateLimiters');
const auth = require('../middleware/auth');
const uploadDocument = require('../middleware/uploadDocument');
const { enforceStorageQuota } = require('../utils/storage');
const tickets = require('../controllers/supportTicket.controller');
const { sendSupportRequest } = require('../utils/mailer');
const { supportInbox } = require('../utils/support');

// Public website contact form (no session). Emails the support inbox
// (SUPPORT_EMAIL, else the SMTP sender) with the sender as reply-to.
const TOPICS = ['Product support', 'Billing', 'Integrations', 'Security', 'Sales', 'Other'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


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

// In-app support requests (signed-in customers; plan rules in the controller).
// Locked organizations can still reach us, so no lock check here.
// Malformed ticket ids in the URL are simply not found
router.param('ticketId', (req, res, next, id) => (mongoose.isValidObjectId(id) ? next() : res.status(404).json({ message: 'Request not found.' })));
const signedIn = [auth, tickets.requireSupportAccess];
router.get('/tickets', signedIn, tickets.listTickets);
router.post('/tickets', signedIn, supportTicketLimiter, uploadDocument.array('attachments', 3), enforceStorageQuota, tickets.createTicket);
router.get('/tickets/:ticketId', signedIn, tickets.getTicket);
router.post('/tickets/:ticketId/messages', signedIn, supportReplyLimiter, uploadDocument.array('attachments', 3), enforceStorageQuota, tickets.replyToTicket);
router.post('/tickets/:ticketId/resolve', signedIn, tickets.resolveTicket);

module.exports = router;
