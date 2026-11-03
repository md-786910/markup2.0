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

// Links open the admin panel (its own app, ADMIN_URL)
const adminLink = (path) => `${URLS.admin}${path}`;

// Slack mrkdwn treats &, < and > as markup (links, mentions); customer text must be escaped
const slackText = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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

  try {
    await Promise.allSettled(promises);
  } catch {
    // Fire and forget: never throw or interrupt caller request flow
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
    text: `*${slackText(k)}:*\n${slackText(v)}`,
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
        text: slackText(summary),
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
 * Send the alert email to the team (escaped template in utils/email/templates.js).
 */
async function sendEmailAlert(toEmail, alert) {
  await mailer.sendAdminAlertEmail(toEmail, alert);
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
    link: adminLink(`/support/${ticket._id}`),
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
    link: adminLink(`/support/${ticket._id}`),
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
    link: adminLink(organization?._id ? `/organizations/${organization._id}` : '/revenue'),
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

function alertErrorSpike({ count, minutes, top = [] }) {
  return sendAdminAlert({
    event: 'server.errors',
    title: `${count} server errors in ${minutes} minutes`,
    summary: `The API answered ${count} requests with a server error in the last ${minutes} minutes. Check the server log and Sentry.`,
    details: Object.fromEntries(top.map(([path, n]) => [path, `${n} errors`])),
    severity: 'critical',
  });
}

module.exports = {
  sendAdminAlert,
  alertErrorSpike,
  alertNewUrgentTicket,
  alertOverdueTicket,
  alertPaymentFailed,
  alertNewPaidCustomer,
  alertRefundIssued,
  alertOrgLocked,
};

