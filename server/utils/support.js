// Shared pieces of customer support (tickets, contact form)

const TICKET_CATEGORIES = ['question', 'bug', 'billing', 'feature', 'account'];

// The inbox that receives support requests: SUPPORT_EMAIL, else the SMTP sender
function supportInbox() {
  const raw = process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || '';
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim();
}

// First-reply deadline from the plan's support rules (calendar hours for now)
function replyDueAt(support, from = new Date()) {
  return support?.replyHours ? new Date(from.getTime() + support.replyHours * 3600 * 1000) : null;
}

const attachmentUrl = (a) => `uploads/documents/${a.filename}`;

// Plain text in, plain text out: trimmed and capped (rendered escaped everywhere)
const cleanText = (value, max) => String(value || '').replace(/\r\n/g, '\n').trim().slice(0, max);

module.exports = { TICKET_CATEGORIES, supportInbox, replyDueAt, attachmentUrl, cleanText };
