const nodemailer = require('nodemailer');
const templates = require('./email/templates');
const { unsubscribeUrl } = require('./unsubscribe');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Fail in seconds, not minutes (nodemailer defaults to 2 min to connect):
    // OTP and password-reset requests wait for the send.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });

  return transporter;
}

// "Kommently <noreply@…>" — keeps a display name SMTP_FROM already has.
function fromAddress() {
  const raw = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@kommently.app';
  return raw.includes('<') ? raw : `Kommently <${raw}>`;
}

// Notification emails (opts.notification) get an unsubscribe link in the footer
// plus List-Unsubscribe / List-Unsubscribe-Post headers (one-click, RFC 8058),
// which Gmail and Yahoo require from bulk senders.
async function send(to, { subject, html, text }, { notification = false, replyTo } = {}) {
  const mail = {
    from: fromAddress(),
    to,
    subject: subject.replace(/[\r\n]+/g, ' '),
    html,
    text,
  };
  if (replyTo) mail.replyTo = replyTo;
  if (notification) {
    const url = unsubscribeUrl(to);
    mail.html = html.replace(
      '<!--k-unsubscribe-->',
      `<p style="margin:0 0 8px;font-size:12px;line-height:18px;color:#6b7280;">Don't want these emails? <a href="${url}" style="color:#6b7280;text-decoration:underline;">Unsubscribe from notification emails</a></p>`,
    );
    mail.text = `${text}\nUnsubscribe from notification emails: ${url}`;
    mail.headers = {
      'List-Unsubscribe': `<${url}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
  }
  await getTransporter().sendMail(mail);
}

// ── Collaboration ───────────────────────────────────────────────────────────

async function sendInvitationEmail(toEmail, inviterName, projectName, signupUrl) {
  await send(toEmail, templates.invitation({ inviterName, projectName, signupUrl }));
}

// Collaboration emails can be turned off by the recipient (unsubscribe link + headers)
const NOTIFICATION = { notification: true };

async function sendPinNotificationEmail(toEmail, actorName, projectName, pinPageUrl, directLink, { pinNumber } = {}) {
  await send(toEmail, templates.newPin({ actorName, projectName, pageUrl: pinPageUrl, pinNumber, link: directLink }), NOTIFICATION);
}

async function sendCommentNotificationEmail(toEmail, actorName, projectName, commentBody, directLink, { pinNumber } = {}) {
  await send(toEmail, templates.comment({ actorName, projectName, commentBody, pinNumber, link: directLink }), NOTIFICATION);
}

async function sendMentionNotificationEmail(toEmail, actorName, projectName, commentBody, directLink, { pinNumber } = {}) {
  await send(toEmail, templates.mention({ actorName, projectName, commentBody, pinNumber, link: directLink }), NOTIFICATION);
}

async function sendPinStatusEmail(toEmail, actorName, projectName, newStatus, directLink, { pinNumber } = {}) {
  await send(toEmail, templates.pinStatus({ actorName, projectName, newStatus, pinNumber, link: directLink }), NOTIFICATION);
}

async function sendDigestEmail(toEmail, projectName, events) {
  await send(toEmail, templates.digest({ projectName, events }), NOTIFICATION);
}

// ── Account ─────────────────────────────────────────────────────────────────

// Website contact form: to the support inbox, answerable with Reply
async function sendSupportRequest(toEmail, request) {
  await send(toEmail, templates.supportRequest(request), { replyTo: { name: request.name, address: request.email } });
}

async function sendPasswordResetEmail(toEmail, resetUrl, expiresIn) {
  await send(toEmail, templates.passwordReset({ resetUrl, expiresIn }));
}

async function sendAdminInviteEmail(toEmail, { name, inviterName, setPasswordUrl }) {
  await send(toEmail, templates.adminInvite({ name, inviterName, setPasswordUrl }));
}

async function sendEmailVerificationOtp(toEmail, otp) {
  await send(toEmail, templates.verificationOtp({ otp }));
}

// ── Billing (monthly invoicing flow) ────────────────────────────────────────
// Amounts are in the smallest currency unit (paise / cents). `currency`
// defaults to INR for callers that predate PayPal support.

async function sendInvoiceCreatedEmail(toEmail, orgName, planName, amount, dueAt, payUrl, currency = 'INR') {
  await send(toEmail, templates.invoiceCreated({ orgName, planName, amount, currency, dueAt, payUrl }));
}

async function sendPaymentReminderEmail(toEmail, orgName, daysLeft, amount, payUrl, currency = 'INR') {
  await send(toEmail, templates.paymentReminder({ orgName, daysLeft, amount, currency, payUrl }));
}

async function sendUrgentPaymentReminderEmail(toEmail, orgName, daysLeft, amount, payUrl, currency = 'INR') {
  await send(toEmail, templates.urgentPaymentReminder({ orgName, daysLeft, amount, currency, payUrl }));
}

async function sendOrgLockedEmail(toEmail, orgName, amount, payUrl, currency = 'INR') {
  await send(toEmail, templates.orgLocked({ orgName, amount, currency, payUrl }));
}

async function sendTrialEndingEmail(toEmail, orgName, daysLeft, endsAt, planUrl) {
  await send(toEmail, templates.trialEnding({ orgName, daysLeft, endsAt, planUrl }));
}

async function sendTrialExpiredEmail(toEmail, orgName, planUrl) {
  await send(toEmail, templates.trialExpired({ orgName, planUrl }));
}

async function sendPaymentReceiptEmail(toEmail, data) {
  await send(toEmail, templates.paymentReceipt(data));
}

async function sendPaymentFailedEmail(toEmail, orgName, amount, currency, payUrl) {
  await send(toEmail, templates.paymentFailed({ orgName, amount, currency, payUrl }));
}

async function sendSubscriptionCanceledEmail(toEmail, orgName, planName, endsAt, planUrl) {
  await send(toEmail, templates.subscriptionCanceled({ orgName, planName, endsAt, planUrl }));
}

module.exports = {
  getTransporter,
  sendSupportRequest,
  sendInvitationEmail,
  sendPinNotificationEmail,
  sendCommentNotificationEmail,
  sendMentionNotificationEmail,
  sendPinStatusEmail,
  sendDigestEmail,
  sendPasswordResetEmail,
  sendAdminInviteEmail,
  sendInvoiceCreatedEmail,
  sendPaymentReminderEmail,
  sendUrgentPaymentReminderEmail,
  sendOrgLockedEmail,
  sendTrialEndingEmail,
  sendTrialExpiredEmail,
  sendPaymentReceiptEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
  sendEmailVerificationOtp,
};
