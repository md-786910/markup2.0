const nodemailer = require('nodemailer');
const { formatCommentForEmail, stripHtmlAndMentions } = require('./mentionHelper');

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

async function sendInvitationEmail(toEmail, inviterName, projectName, signupUrl) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@kommently.app';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Kommently</h1>
      </div>
      <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="margin: 0 0 8px; font-size: 18px; color: #111827;">You've been invited!</h2>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          <strong style="color: #111827;">${inviterName}</strong> has invited you to collaborate on
          <strong style="color: #111827;">${projectName}</strong>.
        </p>
        <a href="${signupUrl}"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          Create Your Account
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0; line-height: 1.5;">
          This invitation expires in 5 days. If you didn't expect this email, you can safely ignore it.
        </p>
      </div>
    </div>
  `;

  await getTransporter().sendMail({
    from,
    to: toEmail,
    subject: `${inviterName} invited you to ${projectName} on Kommently`,
    html,
  });
}

async function sendPinNotificationEmail(toEmail, actorName, projectName, pinPageUrl, directLink) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@kommently.app';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Kommently</h1>
      </div>
      <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="margin: 0 0 8px; font-size: 18px; color: #111827;">New Pin Added</h2>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 8px;">
          <strong style="color: #111827;">${actorName}</strong> added a new pin on
          <strong style="color: #111827;">${projectName}</strong>.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 0 0 24px;">
          Page: ${pinPageUrl}
        </p>
        <a href="${directLink}"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          View Pin
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0; line-height: 1.5;">
          You're receiving this because you're a member of this project.
        </p>
      </div>
    </div>
  `;

  await getTransporter().sendMail({
    from,
    to: toEmail,
    subject: `New pin on ${projectName} by ${actorName}`,
    html,
  });
}

async function sendCommentNotificationEmail(toEmail, actorName, projectName, commentBody, directLink) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@kommently.app';
  const senderName = actorName || 'Someone';
  const formattedContent = formatCommentForEmail(commentBody);

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Kommently</h1>
      </div>
      <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="margin: 0 0 8px; font-size: 18px; color: #111827;">New Comment</h2>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
          <strong style="color: #111827;">${senderName}</strong> commented on
          <strong style="color: #111827;">${projectName}</strong>:
        </p>
        <div style="background: #f9fafb; border-left: 3px solid #2563eb; padding: 12px 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0; font-size: 14px; line-height: 1.6;">
          ${formattedContent}
        </div>
        <a href="${directLink}"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          View Comment
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0; line-height: 1.5;">
          You're receiving this because you're a member of this project.
        </p>
      </div>
    </div>
  `;

  await getTransporter().sendMail({
    from,
    to: toEmail,
    subject: `New comment on ${projectName} by ${senderName}`,
    html,
  });
}

async function sendMentionNotificationEmail(toEmail, actorName, projectName, commentBody, directLink) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@kommently.app';
  const senderName = actorName || 'Someone';
  const formattedContent = formatCommentForEmail(commentBody);

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Kommently</h1>
      </div>
      <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="margin: 0 0 8px; font-size: 18px; color: #111827;">You were mentioned</h2>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
          <strong style="color: #111827;">${senderName}</strong> mentioned you in a comment on
          <strong style="color: #111827;">${projectName}</strong>:
        </p>
        <div style="background: #f9fafb; border-left: 3px solid #2563eb; padding: 12px 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0; font-size: 14px; line-height: 1.6;">
          ${formattedContent}
        </div>
        <a href="${directLink}"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          View Comment
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0; line-height: 1.5;">
          You're receiving this because you were mentioned in a comment.
        </p>
      </div>
    </div>
  `;

  await getTransporter().sendMail({
    from,
    to: toEmail,
    subject: `${senderName} mentioned you in ${projectName}`,
    html,
  });
}

async function sendPinStatusEmail(toEmail, actorName, projectName, newStatus, directLink) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@kommently.app';
  const isResolved = newStatus === 'resolved';
  const statusLabel = isResolved ? 'Resolved' : 'Reopened';
  const accentColor = isResolved ? '#22c55e' : '#f59e0b';
  const senderName = actorName || 'Someone';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Kommently</h1>
      </div>
      <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin: 0 0 8px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${accentColor};"></span>
          <h2 style="margin: 0; font-size: 18px; color: #111827;">Pin ${statusLabel}</h2>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          <strong style="color: #111827;">${senderName}</strong> ${isResolved ? 'resolved' : 'reopened'} a pin on
          <strong style="color: #111827;">${projectName}</strong>.
        </p>
        <a href="${directLink}"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          View Pin
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0; line-height: 1.5;">
          You're receiving this because you're a member of this project.
        </p>
      </div>
    </div>
  `;

  await getTransporter().sendMail({
    from,
    to: toEmail,
    subject: `Pin ${isResolved ? 'resolved' : 'reopened'} on ${projectName} by ${senderName}`,
    html,
  });
}

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@kommently.app';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Kommently</h1>
      </div>
      <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="margin: 0 0 8px; font-size: 18px; color: #111827;">Reset Your Password</h2>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          We received a request to reset your password. Click the button below to choose a new password.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          Reset Password
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0; line-height: 1.5;">
          This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;

  await getTransporter().sendMail({
    from,
    to: toEmail,
    subject: 'Reset your Markup password',
    html,
  });
}

async function sendDigestEmail(toEmail, projectName, events) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@kommently.app';

  // Group events by type
  const groups = {};
  for (const ev of events) {
    if (!groups[ev.type]) groups[ev.type] = [];
    groups[ev.type].push(ev);
  }

  const typeLabels = {
    pin: 'New Pins',
    status: 'Status Changes',
    comment: 'New Comments',
    mention: 'Mentions',
  };

  const typeOrder = ['pin', 'status', 'comment', 'mention'];

  function renderEvent(ev) {
    const rawPreview = stripHtmlAndMentions(ev.commentBody);
    const preview = rawPreview ? (rawPreview.length > 80 ? rawPreview.substring(0, 80) + '...' : rawPreview) : '';
    const actor = ev.actorName || 'Someone';
    let description = '';
    switch (ev.type) {
      case 'pin':
        description = `<strong>${actor}</strong> added a new pin`;
        if (ev.pinNumber) description += ` #${ev.pinNumber}`;
        break;
      case 'status':
        description = `<strong>${actor}</strong> ${ev.pinStatus === 'resolved' ? 'resolved' : 'reopened'} pin`;
        if (ev.pinNumber) description += ` #${ev.pinNumber}`;
        break;
      case 'comment':
        description = `<strong>${actor}</strong>: "${preview}"`;
        break;
      case 'mention':
        description = `<strong>${actor}</strong> mentioned you: "${preview}"`;
        break;
    }
    return `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
          <span style="color: #374151; font-size: 13px;">${description}</span>
          <a href="${ev.link}" style="color: #2563eb; font-size: 12px; text-decoration: none; margin-left: 8px;">View &rarr;</a>
        </td>
      </tr>`;
  }

  let sectionsHtml = '';
  for (const type of typeOrder) {
    const items = groups[type];
    if (!items || items.length === 0) continue;
    sectionsHtml += `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px; font-size: 14px; color: #6b7280; font-weight: 600;">${typeLabels[type]} (${items.length})</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${items.map(renderEvent).join('')}
        </table>
      </div>`;
  }

  const totalCount = events.length;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Kommently</h1>
      </div>
      <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="margin: 0 0 16px; font-size: 18px; color: #111827;">${totalCount} update${totalCount > 1 ? 's' : ''} on ${projectName}</h2>
        ${sectionsHtml}
        <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0; line-height: 1.5;">
          You're receiving this because you're a member of this project.
        </p>
      </div>
    </div>
  `;

  await getTransporter().sendMail({
    from,
    to: toEmail,
    subject: `${totalCount} update${totalCount > 1 ? 's' : ''} on ${projectName}`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Billing emails (monthly invoicing flow)
// ─────────────────────────────────────────────────────────────────────────────

function billingShell({ heading, body, ctaLabel, ctaUrl, footer }) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Kommently</h1>
      </div>
      <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="margin: 0 0 12px; font-size: 18px; color: #111827;">${heading}</h2>
        <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">${body}</div>
        <a href="${ctaUrl}"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          ${ctaLabel}
        </a>
        ${footer ? `<p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0; line-height: 1.5;">${footer}</p>` : ''}
      </div>
    </div>
  `;
}

function formatInr(amountInPaise) {
  const rupees = (amountInPaise || 0) / 100;
  return '₹' + rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function sendInvoiceCreatedEmail(toEmail, orgName, planName, amountInPaise, dueAt, payUrl) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@markup.app';
  const due = new Date(dueAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const html = billingShell({
    heading: 'New invoice for ' + orgName,
    body: `Your monthly invoice for the <strong>${planName}</strong> plan is ready.<br/><br/>
           Amount: <strong>${formatInr(amountInPaise)}</strong><br/>
           Due by: <strong>${due}</strong><br/><br/>
           Pay before the due date to keep your workspace active.`,
    ctaLabel: 'Pay Invoice',
    ctaUrl: payUrl,
    footer: 'You\'re receiving this because your organization is on a paid plan.',
  });
  await getTransporter().sendMail({
    from, to: toEmail,
    subject: `Invoice ${formatInr(amountInPaise)} due — ${orgName}`,
    html,
  });
}

async function sendPaymentReminderEmail(toEmail, orgName, daysLeft, amountInPaise, payUrl) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@kommently.app';
  const html = billingShell({
    heading: 'Reminder: invoice due soon',
    body: `Just a friendly nudge — your invoice for <strong>${orgName}</strong> (<strong>${formatInr(amountInPaise)}</strong>)
           is unpaid. You have <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong> left before your workspace is locked.`,
    ctaLabel: 'Pay Now',
    ctaUrl: payUrl,
  });
  await getTransporter().sendMail({
    from, to: toEmail,
    subject: `Reminder — ${formatInr(amountInPaise)} invoice due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    html,
  });
}

async function sendUrgentPaymentReminderEmail(toEmail, orgName, daysLeft, amountInPaise, payUrl) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@kommently.app';
  const html = billingShell({
    heading: 'Urgent: pay to avoid lockout',
    body: `Your invoice for <strong>${orgName}</strong> (<strong>${formatInr(amountInPaise)}</strong>) is still unpaid.<br/><br/>
           If we don't receive payment within <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>,
           your workspace will be locked and your team will lose access until you pay.`,
    ctaLabel: 'Pay Now',
    ctaUrl: payUrl,
  });
  await getTransporter().sendMail({
    from, to: toEmail,
    subject: `Urgent — workspace will be locked in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    html,
  });
}

async function sendOrgLockedEmail(toEmail, orgName, amountInPaise, payUrl) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@kommently.app';
  const html = billingShell({
    heading: 'Workspace locked',
    body: `Your workspace <strong>${orgName}</strong> has been locked because the invoice for <strong>${formatInr(amountInPaise)}</strong> is overdue.<br/><br/>
           Your team can still log in, but writes are blocked until payment is received. Pay now to restore access — your workspace will unlock immediately.`,
    ctaLabel: 'Pay Now to Unlock',
    ctaUrl: payUrl,
  });
  await getTransporter().sendMail({
    from, to: toEmail,
    subject: `${orgName} is locked — pay to restore access`,
    html,
  });
}

async function sendEmailVerificationOtp(toEmail, otp) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@kommently.app';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Kommently</h1>
      </div>
      <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="margin: 0 0 12px; font-size: 18px; color: #111827;">Verify your email</h2>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Use this code to finish creating your Kommently workspace. The code expires in 10 minutes.
        </p>
        <div style="background: #f3f4f6; border: 1px dashed #d1d5db; border-radius: 10px; padding: 18px; text-align: center; margin: 0 0 20px;">
          <span style="font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #111827;">
            ${otp}
          </span>
        </div>
        <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
          If you didn't request this code, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;
  await getTransporter().sendMail({
    from, to: toEmail,
    subject: `${otp} is your Kommently verification code`,
    html,
  });
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
