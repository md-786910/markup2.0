const mongoose = require('mongoose');
const { Schema } = mongoose;

// A support request from a customer, answered from the admin panel.
// Which plans can open one is set in config/plans.js (support.tickets).
const attachmentSchema = new Schema({
  filename: { type: String, required: true },   // stored name in uploads/documents
  originalName: { type: String, default: '' },
  mimetype: { type: String, default: '' },
  size: { type: Number, default: 0 },
}, { _id: false });

const messageSchema = new Schema({
  authorType: { type: String, enum: ['customer', 'admin'], required: true },
  author: { type: Schema.Types.ObjectId, required: true },   // User or AdminUser
  authorName: { type: String, default: '' },                 // kept for display after deletions
  body: { type: String, required: true, maxlength: 10000 },  // sanitized HTML/text
  attachments: { type: [attachmentSchema], default: [] },
  // Admin-only note, never sent to the customer
  internal: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

const supportTicketSchema = new Schema({
  number: { type: Number, required: true, unique: true },   // shown as #1042
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true, trim: true, maxlength: 140 },
  category: { type: String, enum: ['question', 'bug', 'billing', 'feature', 'account'], default: 'question' },
  status: { type: String, enum: ['open', 'waiting_on_customer', 'resolved', 'closed'], default: 'open' },
  priority: { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },
  assignee: { type: Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  // First-reply target from the plan (calendar hours for now)
  dueAt: { type: Date, default: null },
  firstResponseAt: { type: Date, default: null },
  lastCustomerReplyAt: { type: Date, default: null },
  lastAdminReplyAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
  // When the customer last opened it, for the "new reply" dot in the app
  customerLastReadAt: { type: Date, default: null },
  // Sort key for the admin inbox (urgent first); kept in sync with priority
  priorityRank: { type: Number, default: 2 },
  // Captured by the app when the request is sent
  context: {
    url: { type: String, default: '' },
    project: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
    plan: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    viewport: { type: String, default: '' },
    appVersion: { type: String, default: '' },
  },
  messages: { type: [messageSchema], default: [] },
}, { timestamps: true });

supportTicketSchema.index({ organization: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1, dueAt: 1 });
supportTicketSchema.index({ assignee: 1, status: 1 });
supportTicketSchema.index({ requester: 1, createdAt: -1 });

const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2 };
supportTicketSchema.index({ status: 1, priorityRank: 1, dueAt: 1 });
supportTicketSchema.pre('save', function () {
  if (this.isModified('priority') || this.isNew) this.priorityRank = PRIORITY_RANK[this.priority] ?? 2;
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
