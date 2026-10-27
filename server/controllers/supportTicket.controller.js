const SupportTicket = require('../models/SupportTicket');
const asyncHandler = require('../utils/asyncHandler');
const { nextSequence } = require('../models/Counter');
const { getSupportForPlan, PLANS } = require('../config/plans');
const { URLS } = require('../config/env');
const { TICKET_CATEGORIES, supportInbox, replyDueAt, attachmentUrl, cleanText } = require('../utils/support');
const { sendSupportTicketToTeam } = require('../utils/mailer');
const { releaseStorage, deleteStoredFiles } = require('../utils/storage');

// Support requests from inside the app (customer side). Which plans may open
// them comes from config/plans.js (support.tickets); owners and admins see
// every request of their organization, others only their own.

const MAX_SUBJECT = 140;
const MAX_BODY = 10000;

const canSeeAll = (user) => ['owner', 'admin'].includes(user.role);

function attachmentsFrom(req) {
  return (req.files || []).map((f) => ({ filename: f.filename, originalName: f.originalname, mimetype: f.mimetype, size: f.size }));
}

// Uploaded files of a request that is refused after multer ran
async function dropUploads(req) {
  const files = req.files || [];
  if (!files.length) return;
  deleteStoredFiles(files.map((f) => `uploads/documents/${f.filename}`));
  await releaseStorage(req.organization?._id, files.reduce((n, f) => n + (f.size || 0), 0)).catch(() => {});
}

// What a customer may see of a ticket: no internal notes, no admin ids
function forCustomer(ticket) {
  const t = ticket.toObject ? ticket.toObject() : ticket;
  return {
    _id: t._id,
    number: t.number,
    subject: t.subject,
    category: t.category,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    lastAdminReplyAt: t.lastAdminReplyAt,
    customerLastReadAt: t.customerLastReadAt || null,
    requester: t.requester && t.requester.name ? { _id: t.requester._id, name: t.requester.name } : t.requester,
    messages: (t.messages || []).filter((m) => !m.internal).map((m) => ({
      _id: m._id,
      authorType: m.authorType,
      authorName: m.authorType === 'admin' ? `${(m.authorName || 'Support').split(' ')[0]} (Kommently)` : m.authorName,
      body: m.body,
      attachments: (m.attachments || []).map((a) => ({ ...a, path: attachmentUrl(a) })),
      createdAt: m.createdAt,
    })),
  };
}

async function notifyTeam(req, ticket, message, isReply) {
  const inbox = supportInbox();
  if (!inbox) return;
  try {
    await sendSupportTicketToTeam(inbox, {
      number: ticket.number,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      orgName: req.organization.name,
      planName: (PLANS[req.organization.plan]?.name) || (req.organization.plan === 'trial' ? 'Trial' : req.organization.plan),
      requesterName: req.user.name,
      requesterEmail: req.user.email,
      message,
      isReply,
      dueAt: ticket.dueAt,
      ticketUrl: `${URLS.admin}/support/${ticket._id}`,
    });
  } catch (err) {
    req.log.error({ err }, 'support ticket email to the team failed');
  }
}

function findForUser(req, id) {
  const filter = { _id: id, organization: req.organization._id };
  if (!canSeeAll(req.user)) filter.requester = req.user._id;
  return SupportTicket.findOne(filter);
}

// Every ticket route needs an organization and a member (not a guest reviewer)
exports.requireSupportAccess = (req, res, next) => {
  if (!req.organization) return res.status(400).json({ message: 'Join or create an organization first.' });
  if (req.user.role === 'guest') return res.status(403).json({ message: 'Ask the team that invited you to contact support.' });
  next();
};

// GET /support/tickets
exports.listTickets = asyncHandler(async (req, res) => {
  const filter = { organization: req.organization._id };
  if (!canSeeAll(req.user)) filter.requester = req.user._id;
  const tickets = await SupportTicket.find(filter)
    .sort({ updatedAt: -1 })
    .limit(100)
    .select('number subject category status createdAt updatedAt lastAdminReplyAt customerLastReadAt requester')
    .populate('requester', 'name')
    .lean();
  res.json({
    tickets: tickets.map((t) => ({
      ...t,
      unread: !!t.lastAdminReplyAt && (!t.customerLastReadAt || t.lastAdminReplyAt > t.customerLastReadAt),
    })),
    support: getSupportForPlan(req.organization.plan),
  });
});

// POST /support/tickets { subject, category, body, context } + attachments
exports.createTicket = asyncHandler(async (req, res) => {
  const support = getSupportForPlan(req.organization.plan);
  if (!support.tickets) {
    await dropUploads(req);
    return res.status(403).json({ message: 'In-app support starts on the Starter plan. Email us in the meantime.', code: 'FEATURE_NOT_AVAILABLE' });
  }
  const subject = cleanText(req.body.subject, MAX_SUBJECT);
  const body = cleanText(req.body.body, MAX_BODY);
  if (subject.length < 3) { await dropUploads(req); return res.status(400).json({ message: 'Add a short subject.' }); }
  if (body.length < 10) { await dropUploads(req); return res.status(400).json({ message: 'Tell us a bit more (at least 10 characters).' }); }

  let context = {};
  try { context = typeof req.body.context === 'string' ? JSON.parse(req.body.context) : (req.body.context || {}); } catch { context = {}; }
  const now = new Date();
  const ticket = await SupportTicket.create({
    number: 1000 + await nextSequence('support_ticket'),
    organization: req.organization._id,
    requester: req.user._id,
    subject,
    category: TICKET_CATEGORIES.includes(req.body.category) ? req.body.category : 'question',
    priority: support.priority,
    dueAt: replyDueAt(support, now),
    lastCustomerReplyAt: now,
    customerLastReadAt: now,
    context: {
      // Page URLs only, without query strings (tokens live there)
      url: cleanText(String(context.url || '').split(/[?#]/)[0], 500),
      project: /^[a-f0-9]{24}$/.test(String(context.project || '')) ? context.project : null,
      plan: req.organization.plan,
      userAgent: cleanText(req.get('user-agent'), 300),
      viewport: cleanText(context.viewport, 20),
      appVersion: cleanText(context.appVersion, 40),
    },
    messages: [{ authorType: 'customer', author: req.user._id, authorName: req.user.name, body, attachments: attachmentsFrom(req) }],
  });
  notifyTeam(req, ticket, body, false);
  res.status(201).json({ ticket: forCustomer(ticket) });
});

// GET /support/tickets/:ticketId (marks our replies as read)
exports.getTicket = asyncHandler(async (req, res) => {
  const ticket = await findForUser(req, req.params.ticketId);
  if (!ticket) return res.status(404).json({ message: 'Request not found.' });
  ticket.customerLastReadAt = new Date();
  await ticket.save();
  res.json({ ticket: forCustomer(ticket) });
});

// POST /support/tickets/:ticketId/messages { body } + attachments
exports.replyToTicket = asyncHandler(async (req, res) => {
  const ticket = await findForUser(req, req.params.ticketId);
  if (!ticket) { await dropUploads(req); return res.status(404).json({ message: 'Request not found.' }); }
  const body = cleanText(req.body.body, MAX_BODY);
  if (!body) { await dropUploads(req); return res.status(400).json({ message: 'Write a message first.' }); }

  const now = new Date();
  ticket.messages.push({ authorType: 'customer', author: req.user._id, authorName: req.user.name, body, attachments: attachmentsFrom(req) });
  ticket.lastCustomerReplyAt = now;
  ticket.customerLastReadAt = now;
  // A reply reopens a resolved request and hands it back to us
  if (ticket.status !== 'open') ticket.status = 'open';
  ticket.resolvedAt = null;
  await ticket.save();
  notifyTeam(req, ticket, body, true);
  res.status(201).json({ ticket: forCustomer(ticket) });
});

// POST /support/tickets/:ticketId/resolve: the customer says it's sorted
exports.resolveTicket = asyncHandler(async (req, res) => {
  const ticket = await findForUser(req, req.params.ticketId);
  if (!ticket) return res.status(404).json({ message: 'Request not found.' });
  ticket.status = 'resolved';
  ticket.resolvedAt = new Date();
  await ticket.save();
  res.json({ ticket: forCustomer(ticket) });
});

exports.forCustomer = forCustomer;
