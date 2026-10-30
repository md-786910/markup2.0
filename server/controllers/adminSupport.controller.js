const SupportTicket = require('../models/SupportTicket');
const AdminUser = require('../models/AdminUser');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Project = require('../models/Project');
const Pin = require('../models/Pin');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const asyncHandler = require('../utils/asyncHandler');
const { supportTicketUrl } = require('../utils/email/templates');
const { sendSupportReplyEmail } = require('../utils/mailer');
const mongoose = require('mongoose');
const { attachmentUrl, cleanText, replyDueAt, REPLY_HOURS_BY_PRIORITY } = require('../utils/support');
const { logAdminAction } = require('../utils/activityLogger');
const { getPlansWithOverrides } = require('../config/plans');
const { monthlyRevenue, lifecycleStatus } = require('../utils/orgStatus');

// The admin Support inbox: every customer request, sorted by priority and
// reply deadline, with the customer's context next to it.

const OPEN_STATUSES = ['open', 'waiting_on_customer'];

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePaging(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
  return { page, limit };
}

const withUrls = (t) => ({
  ...t,
  messages: (t.messages || []).map((m) => ({ ...m, attachments: (m.attachments || []).map((a) => ({ ...a, path: attachmentUrl(a) })) })),
});

// GET /admin/support/tickets?view=open|waiting|resolved|all&priority=&assignee=me|none|<id>&overdue=1&search=&orgId=
exports.listTickets = asyncHandler(async (req, res) => {
  const { view = 'open', priority, assignee, overdue, search, orgId } = req.query;
  const { page, limit } = parsePaging(req.query);
  const filter = {};
  if (view === 'open') filter.status = 'open';
  else if (view === 'waiting') filter.status = 'waiting_on_customer';
  else if (view === 'resolved') filter.status = { $in: ['resolved', 'closed'] };
  if (['normal', 'high', 'urgent'].includes(priority)) filter.priority = priority;
  if (assignee === 'me') filter.assignee = req.admin._id;
  else if (assignee === 'none') filter.assignee = null;
  else if (/^[a-f0-9]{24}$/.test(String(assignee || ''))) filter.assignee = assignee;
  if (overdue === '1') { filter.dueAt = { $ne: null, $lt: new Date() }; filter.firstResponseAt = null; filter.status = 'open'; }
  if (/^[a-f0-9]{24}$/.test(String(orgId || ''))) filter.organization = orgId;
  if (search) {
    const raw = String(search).trim().slice(0, 100);
    const cleaned = raw.replace(/^#/, '').trim();
    if (cleaned) {
      const re = new RegExp(escapeRegex(cleaned), 'i');
      const orgs = await Organization.find({ name: re }).select('_id').limit(100).lean();
      const number = parseInt(cleaned, 10);
      filter.$or = [{ subject: re }, { organization: { $in: orgs.map((o) => o._id) } }, ...(Number.isFinite(number) ? [{ number }] : [])];
    }
  }

  const sort = view === 'resolved' ? { resolvedAt: -1, updatedAt: -1 } : { priorityRank: 1, dueAt: 1, createdAt: 1 };
  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('number subject category status priority assignee dueAt firstResponseAt createdAt updatedAt lastCustomerReplyAt lastAdminReplyAt organization requester')
      .populate('organization', 'name plan')
      .populate('requester', 'name email')
      .populate('assignee', 'name')
      .lean(),
    SupportTicket.countDocuments(filter),
  ]);
  res.json({ tickets, total, page, totalPages: Math.ceil(total / limit) });
});

// GET /admin/support/stats: counts for the sidebar badge and the overview
exports.getStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const [open, waiting, overdue, unassigned, mine] = await Promise.all([
    SupportTicket.countDocuments({ status: 'open' }),
    SupportTicket.countDocuments({ status: 'waiting_on_customer' }),
    SupportTicket.countDocuments({ status: 'open', firstResponseAt: null, dueAt: { $ne: null, $lt: now } }),
    SupportTicket.countDocuments({ status: 'open', assignee: null }),
    SupportTicket.countDocuments({ status: { $in: OPEN_STATUSES }, assignee: req.admin._id }),
  ]);
  res.json({ open, waiting, overdue, unassigned, mine });
});

// GET /admin/support/tickets/:ticketId: thread (with internal notes) + customer context
exports.getTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.ticketId)
    .populate('organization', 'name plan trialEndsAt isLocked lockedReason subscription deal deletionScheduledAt createdAt')
    .populate('requester', 'name email role lastSeen createdAt')
    .populate('assignee', 'name email')
    .populate('context.project', 'name projectType websiteUrl')
    .lean();
  if (!ticket) return res.status(404).json({ message: 'Request not found.' });

  const orgId = ticket.organization?._id;
  const [members, projectIds, otherTickets, admins, recentActivity, plans] = await Promise.all([
    orgId ? User.find({ organization: orgId }).select('lastSeen').lean() : [],
    orgId ? Project.find({ organization: orgId, status: 'active' }).distinct('_id') : [],
    orgId ? SupportTicket.find({ organization: orgId, _id: { $ne: ticket._id } }).sort({ createdAt: -1 }).limit(5).select('number subject status createdAt').lean() : [],
    AdminUser.find({ status: 'active' }).select('name').sort({ name: 1 }).lean(),
    // What the customer did lately (not our own admin actions)
    orgId ? Activity.find({ organization: orgId, 'metadata.actorRole': { $ne: 'superadmin' } })
      .sort({ createdAt: -1 }).limit(5)
      .select('action actor actorGuest metadata project createdAt')
      .populate('actor', 'name').populate('project', 'name').lean() : [],
    getPlansWithOverrides(),
  ]);
  const openPins = projectIds.length ? await Pin.countDocuments({ project: { $in: projectIds }, status: { $ne: 'resolved' } }) : 0;
  const lastActiveAt = members.reduce((max, m) => (m.lastSeen && (!max || m.lastSeen > max) ? m.lastSeen : max), null);

  res.json({
    ticket: withUrls(ticket),
    customer: {
      members: members.length, activeProjects: projectIds.length, openPins, lastActiveAt, otherTickets, recentActivity,
      status: ticket.organization ? lifecycleStatus(ticket.organization) : null,
      mrr: ticket.organization ? monthlyRevenue(ticket.organization, plans) : 0,
    },
    admins,
  });
});

// Account-level in-app notification for the requester (no project)
async function notifyRequester(req, ticket, message) {
  try {
    const notif = await Notification.create({
      recipient: ticket.requester,
      project: null,
      type: 'support_reply',
      title: `Kommently support replied to #${ticket.number}`,
      message: message.slice(0, 300),
      metadata: { ticketId: String(ticket._id), number: ticket.number, subject: ticket.subject, adminName: req.admin.name.split(' ')[0] },
    });
    req.app.get('io')?.to(`user:${ticket.requester}`).emit('notification:new', notif.toObject());
  } catch (err) {
    req.log.error({ err }, 'support reply notification failed');
  }
}

async function emailRequester(req, ticket, { message, resolved }) {
  try {
    const requester = await User.findById(ticket.requester).select('email');
    if (!requester?.email) return;
    await sendSupportReplyEmail(requester.email, {
      number: ticket.number,
      subject: ticket.subject,
      adminName: req.admin.name.split(' ')[0],
      message,
      resolved,
      ticketUrl: supportTicketUrl(ticket._id),
    });
  } catch (err) {
    req.log.error({ err }, 'support reply email failed');
  }
}

// POST /admin/support/tickets/:ticketId/messages { body, internal, status? }
exports.replyToTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.ticketId);
  if (!ticket) return res.status(404).json({ message: 'Request not found.' });
  const body = cleanText(req.body?.body, 10000);
  if (!body) return res.status(400).json({ message: 'Write a reply first.' });
  const internal = !!req.body?.internal;
  const wasResolved = ['resolved', 'closed'].includes(ticket.status);

  const now = new Date();
  ticket.messages.push({ authorType: 'admin', author: req.admin._id, authorName: req.admin.name, body, internal });
  if (!internal) {
    if (!ticket.firstResponseAt) ticket.firstResponseAt = now;
    ticket.lastAdminReplyAt = now;
    const next = ['open', 'waiting_on_customer', 'resolved'].includes(req.body?.status) ? req.body.status : 'waiting_on_customer';
    ticket.status = next;
    ticket.resolvedAt = next === 'resolved' ? now : null;
  }
  if (!ticket.assignee) ticket.assignee = req.admin._id;
  await ticket.save();

  if (!internal) {
    notifyRequester(req, ticket, body);
    emailRequester(req, ticket, { message: body, resolved: ticket.status === 'resolved' });
    if (!wasResolved && ticket.status === 'resolved') logAdminAction(ticket.organization, req.admin, 'support.resolved', { number: ticket.number });
  }
  res.status(201).json({ ticket: withUrls(ticket.toObject()) });
});

// PATCH /admin/support/tickets/:ticketId { status?, priority?, assignee? }
exports.updateTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.ticketId);
  if (!ticket) return res.status(404).json({ message: 'Request not found.' });
  const { status, priority, assignee } = req.body || {};
  const wasResolved = ['resolved', 'closed'].includes(ticket.status);
  const before = { status: ticket.status, priority: ticket.priority, assignee: ticket.assignee ? String(ticket.assignee) : null };

  if (status !== undefined) {
    if (!['open', 'waiting_on_customer', 'resolved', 'closed'].includes(status)) return res.status(400).json({ message: 'Unknown status.' });
    ticket.status = status;
    ticket.resolvedAt = ['resolved', 'closed'].includes(status) ? (ticket.resolvedAt || new Date()) : null;
  }
  if (priority !== undefined) {
    if (!['normal', 'high', 'urgent'].includes(priority)) return res.status(400).json({ message: 'Unknown priority.' });
    if (priority !== ticket.priority) {
      ticket.priority = priority;
      // The reply deadline follows the new priority
      if (!ticket.firstResponseAt) ticket.dueAt = replyDueAt({ replyHours: REPLY_HOURS_BY_PRIORITY[priority] }, ticket.createdAt);
    }
  }
  if (assignee !== undefined) {
    if (assignee === null || assignee === '') ticket.assignee = null;
    else {
      const target = mongoose.isValidObjectId(assignee) && await AdminUser.findOne({ _id: assignee, status: 'active' }).select('_id');
      if (!target) return res.status(400).json({ message: 'Assign the request to an active admin.' });
      ticket.assignee = target._id;
    }
  }
  await ticket.save();
  // Resolving tells the customer, once
  const resolvedNow = !wasResolved && ticket.status === 'resolved';
  if (resolvedNow) {
    emailRequester(req, ticket, { message: '', resolved: true });
    logAdminAction(ticket.organization, req.admin, 'support.resolved', { number: ticket.number });
  }
  // Every other change (status, priority, assignee) goes to the action log too
  const after = { status: ticket.status, priority: ticket.priority, assignee: ticket.assignee ? String(ticket.assignee) : null };
  const changes = {};
  for (const key of Object.keys(after)) {
    if (after[key] !== before[key] && !(key === 'status' && resolvedNow)) changes[key] = { from: before[key], to: after[key] };
  }
  if (Object.keys(changes).length) logAdminAction(ticket.organization, req.admin, 'support.updated', { number: ticket.number, changes });
  const populated = await SupportTicket.findById(ticket._id).populate('assignee', 'name email').lean();
  res.json({ ticket: withUrls(populated) });
});
