const nodemailer = require('nodemailer');
const templates = require('./email/templates');

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
  });

  return transporter;
}

// "Kommently <noreply@…>" — keeps a display name SMTP_FROM already has.
function fromAddress() {
  const raw = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@kommently.app';
  return raw.includes('<') ? raw : `Kommently <${raw}>`;
}

async function send(to, { subject, html, text }) {
  await getTransporter().sendMail({
    from: fromAddress(),
    to,
    subject: subject.replace(/[\r\n]+/g, ' '),
    html,
    text,
  });
}

// ── Collaboration ───────────────────────────────────────────────────────────

async function sendInvitationEmail(toEmail, inviterName, projectName, signupUrl) {
  await send(toEmail, templates.invitation({ inviterName, projectName, signupUrl }));
}

async function sendPinNotificationEmail(toEmail, actorName, projectName, pinPageUrl, directLink, { pinNumber } = {}) {
  await send(toEmail, templates.newPin({ actorName, projectName, pageUrl: pinPageUrl, pinNumber, link: directLink }));
}

async function sendCommentNotificationEmail(toEmail, actorName, projectName, commentBody, directLink, { pinNumber } = {}) {
  await send(toEmail, templates.comment({ actorName, projectName, commentBody, pinNumber, link: directLink }));
}

async function sendMentionNotificationEmail(toEmail, actorName, projectName, commentBody, directLink, { pinNumber } = {}) {
  await send(toEmail, templates.mention({ actorName, projectName, commentBody, pinNumber, link: directLink }));
}

async function sendPinStatusEmail(toEmail, actorName, projectName, newStatus, directLink, { pinNumber } = {}) {
  await send(toEmail, templates.pinStatus({ actorName, projectName, newStatus, pinNumber, link: directLink }));
}

async function sendDigestEmail(toEmail, projectName, events) {
  await send(toEmail, templates.digest({ projectName, events }));
}

// ── Account ─────────────────────────────────────────────────────────────────

async function sendPasswordResetEmail(toEmail, resetUrl) {
  await send(toEmail, templates.passwordReset({ resetUrl }));
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

module.exports = {
  sendInvitationEmail,
  sendPinNotificationEmail,
  sendCommentNotificationEmail,
  sendMentionNotificationEmail,
  sendPinStatusEmail,
  sendDigestEmail,
  sendPasswordResetEmail,
  sendInvoiceCreatedEmail,
  sendPaymentReminderEmail,
  sendUrgentPaymentReminderEmail,
  sendOrgLockedEmail,
  sendEmailVerificationOtp,
};
