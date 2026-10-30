/**
 * Centralized Admin Alerting System
 *
 * Sends fire-and-forget notifications to operational staff via:
 * 1. Slack Webhook (ADMIN_ALERTS_SLACK_WEBHOOK)
 * 2. Admin Alert Email (ADMIN_ALERTS_EMAIL or fallback to SUPPORT_EMAIL)
 *
 * Used for critical events:
 * - Urgent support ticket created
 * - Support ticket reply SLA overdue
 * - Payment failed / subscription overdue
 * - New paid customer converted
 * - Refund issued
 * - Organization locked
 * - Server error spikes
 */

const axios = require('axios');
const mailer = require('./mailer');
const { URLS } = require('../config/env');
const { logger } = require('./logger');

// Customer-supplied text (ticket subjects, names) must not become markup
const escHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escSlack = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Links open the admin panel (its own app and host), not the customer app
const adminLink = (path) => `${URLS.admin}${path}`;

/**
 * Dispatch an alert across configured channels asynchronously.
 *
 * @param {object} alert
 * @param {string} alert.event - e.g. 'ticket.urgent', 'payment.failed', 'customer.new', 'refund.issued', 'org.locked'
 * @param {string} alert.title - Headline message
 * @param {string} alert.summary - 1-2 sentence description
 * @param {object} [alert.details] - Key-value metadata pairs
 * @param {string} [alert.link] - Actionable URL in admin dashboard
 * @param {'info'|'warning'|'critical'} [alert.severity='info'] - Severity tag
 */
async function sendAdminAlert({ event, title, summary, details = {}, link, severity = 'info' }) {
  const promises = [];

  // 1. Dispatch to Slack Webhook if configured
  const slackWebhook = process.env.ADMIN_ALERTS_SLACK_WEBHOOK;
  if (slackWebhook && slackWebhook.startsWith('http')) {
    promises.push(sendSlackAlert(slackWebhook, { event, title, summary, details, link, severity }));
  }

  // 2. Dispatch to Admin Email if configured
  const adminEmail = process.env.ADMIN_ALERTS_EMAIL || process.env.SUPPORT_EMAIL;
  if (adminEmail) {
    promises.push(sendEmailAlert(adminEmail, { event, title, summary, details, link, severity }));
  }

  // Fire and forget: never throw into the caller, but say when a channel failed
  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === 'rejected') logger.warn({ event, err: r.reason?.message }, 'admin alert could not be delivered');
  }
}

/**
 * Send formatted Slack Block Kit message.
 */
async function sendSlackAlert(webhookUrl, { event, title, summary, details, link, severity }) {
  const colorMap = {
    info: '#2563eb',     // Blue
    warning: '#f59e0b',  // Amber
    critical: '#dc2626', // Red
  };

  const fields = Object.entries(details).map(([k, v]) => ({
    type: 'mrkdwn',
    text: `*${escSlack(k)}:*\n${escSlack(v)}`,
  }));

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `[${severity.toUpperCase()}] ${title}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: escSlack(summary),
      },
    },
  ];

  if (fields.length > 0) {
    blocks.push({
      type: 'section',
      fields: fields.slice(0, 10), // Slack limit
    });
  }

  if (link) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View in Admin Panel',
            emoji: true,
          },
          url: link,
          style: severity === 'critical' ? 'danger' : 'primary',
        },
      ],
    });
  }

  const payload = {
    attachments: [
      {
        color: colorMap[severity] || '#2563eb',
        blocks,
      },
    ],
  };

  await axios.post(webhookUrl, payload, { timeout: 4000 });
}

/**
 * Send formatted alert email to team.
 */
async function sendEmailAlert(toEmail, { event, title, summary, details, link, severity }) {
  const subject = `[Kommently Alert] [${severity.toUpperCase()}] ${title}`;
  
  const detailRows = Object.entries(details)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:600;color:#475569;">${escHtml(k)}</td><td style="padding:6px 12px;color:#0f172a;">${escHtml(v)}</td></tr>`)
    .join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:8px;">
      <h2 style="color:${severity === 'critical' ? '#dc2626' : '#2563eb'};margin-top:0;">${escHtml(title)}</h2>
      <p style="font-size:15px;color:#334155;line-height:1.5;">${escHtml(summary)}</p>
      ${detailRows ? `<table style="width:100%;margin:16px 0;border-collapse:collapse;background:#f8fafc;border-radius:6px;">${detailRows}</table>` : ''}
      ${link ? `<p style="margin-top:24px;"><a href="${escHtml(link)}" style="background:#2563eb;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Open in Admin Panel</a></p>` : ''}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin-top:32px;" />
      <p style="font-size:12px;color:#94a3b8;margin-bottom:0;">Automated notification from Kommently Alert Engine (${event})</p>
    </div>
  `;

  const text = [title, summary, ...Object.entries(details).map(([k, v]) => `${k}: ${v}`), link || ''].join('\n');
  await mailer.sendAdminAlertEmail(toEmail, { subject, html, text });
}

// Convenience Event Helpers

function alertNewUrgentTicket({ ticket, organization, requester }) {
  return sendAdminAlert({
    event: 'ticket.urgent',
    title: `Urgent Support Ticket #${ticket.number}`,
    summary: `Customer ${requester.name} (${organization?.name || 'Unknown'}) opened an urgent request: "${ticket.subject}"`,
    details: {
      Category: ticket.category || 'general',
      Organization: organization?.name || 'N/A',
      Plan: organization?.plan || 'N/A',
      Requester: `${requester.name} <${requester.email}>`,
    },
    link: adminLink(ticket._id ? `/support/${ticket._id}` : '/support'),
    severity: 'critical',
  });
}

function alertOverdueTicket({ ticket, organization }) {
  return sendAdminAlert({
    event: 'ticket.overdue',
    title: `Overdue SLA: Ticket #${ticket.number}`,
    summary: `Support ticket #${ticket.number} (${ticket.subject}) has exceeded its first-reply target.`,
    details: {
      Priority: ticket.priority,
      Organization: organization?.name || 'N/A',
      'Due At': ticket.dueAt ? new Date(ticket.dueAt).toISOString() : 'Immediate',
    },
    link: adminLink(ticket._id ? `/support/${ticket._id}` : '/support'),
    severity: 'warning',
  });
}

function alertPaymentFailed({ organization, invoice, error }) {
  return sendAdminAlert({
    event: 'payment.failed',
    title: `Payment Failed: ${organization.name}`,
    summary: `Attempt to renew ${organization.name} on ${organization.plan} failed.`,
    details: {
      Organization: organization.name,
      Plan: organization.plan,
      Amount: invoice ? `${(invoice.amount / 100).toFixed(2)} ${invoice.currency}` : 'N/A',
      Reason: error || 'Payment gateway declined transaction',
    },
    link: adminLink(`/organizations/${organization._id}`),
    severity: 'warning',
  });
}

function alertNewPaidCustomer({ organization, amount, currency, provider }) {
  return sendAdminAlert({
    event: 'customer.new',
    title: `New Paying Customer: ${organization.name}!`,
    summary: `${organization.name} just subscribed to the ${organization.plan} plan.`,
    details: {
      Plan: organization.plan,
      Revenue: `${(amount / 100).toFixed(2)} ${currency}`,
      Gateway: provider,
    },
    link: adminLink(`/organizations/${organization._id}`),
    severity: 'info',
  });
}

function alertRefundIssued({ organization, invoice, amount, currency, admin }) {
  return sendAdminAlert({
    event: 'refund.issued',
    title: `Refund Issued: ${organization?.name || 'Organization'}`,
    summary: `Admin ${admin.name} issued a refund of ${(amount / 100).toFixed(2)} ${currency}.`,
    details: {
      Organization: organization?.name || 'N/A',
      'Invoice #': invoice?.invoiceNumber || invoice?._id || 'N/A',
      Amount: `${(amount / 100).toFixed(2)} ${currency}`,
      IssuedBy: admin.name,
    },
    link: adminLink('/revenue'),
    severity: 'warning',
  });
}

function alertOrgLocked({ organization, reason }) {
  return sendAdminAlert({
    event: 'org.locked',
    title: `Account Locked: ${organization.name}`,
    summary: `Organization ${organization.name} has been locked (${reason}).`,
    details: {
      Organization: organization.name,
      Plan: organization.plan,
      Reason: reason,
    },
    link: adminLink(`/organizations/${organization._id}`),
    severity: 'critical',
  });
}

module.exports = {
  sendAdminAlert,
  alertNewUrgentTicket,
  alertOverdueTicket,
  alertPaymentFailed,
  alertNewPaidCustomer,
  alertRefundIssued,
  alertOrgLocked,
};

