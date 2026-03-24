const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

async function sendInvitationEmail(toEmail, inviterName, projectName, signupUrl) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@markup.app';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Markup</h1>
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
          This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
        </p>
      </div>
    </div>
  `;

  await getTransporter().sendMail({
    from,
    to: toEmail,
    subject: `${inviterName} invited you to ${projectName} on Markup`,
    html,
  });
}

async function sendPinNotificationEmail(toEmail, actorName, projectName, pinPageUrl, directLink) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@markup.app';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Markup</h1>
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
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@markup.app';
  const preview = commentBody.length > 200 ? commentBody.substring(0, 200) + '...' : commentBody;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Markup</h1>
      </div>
      <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="margin: 0 0 8px; font-size: 18px; color: #111827;">New Comment</h2>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 8px;">
          <strong style="color: #111827;">${actorName}</strong> commented on
          <strong style="color: #111827;">${projectName}</strong>:
        </p>
        <div style="background: #f9fafb; border-left: 3px solid #2563eb; padding: 12px 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
          <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">${preview}</p>
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
    subject: `New comment on ${projectName} by ${actorName}`,
    html,
  });
}

async function sendMentionNotificationEmail(toEmail, actorName, projectName, commentBody, directLink) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@markup.app';
  const preview = commentBody.length > 200 ? commentBody.substring(0, 200) + '...' : commentBody;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Markup</h1>
      </div>
      <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="margin: 0 0 8px; font-size: 18px; color: #111827;">You were mentioned</h2>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 8px;">
          <strong style="color: #111827;">${actorName}</strong> mentioned you in a comment on
          <strong style="color: #111827;">${projectName}</strong>:
        </p>
        <div style="background: #f9fafb; border-left: 3px solid #2563eb; padding: 12px 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
          <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">${preview}</p>
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
    subject: `${actorName} mentioned you in ${projectName}`,
    html,
  });
}

async function sendPinStatusEmail(toEmail, actorName, projectName, newStatus, directLink) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@markup.app';
  const isResolved = newStatus === 'resolved';
  const statusLabel = isResolved ? 'Resolved' : 'Reopened';
  const accentColor = isResolved ? '#22c55e' : '#f59e0b';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Markup</h1>
      </div>
      <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin: 0 0 8px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${accentColor};"></span>
          <h2 style="margin: 0; font-size: 18px; color: #111827;">Pin ${statusLabel}</h2>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          <strong style="color: #111827;">${actorName}</strong> ${isResolved ? 'resolved' : 'reopened'} a pin on
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
    subject: `Pin ${isResolved ? 'resolved' : 'reopened'} on ${projectName} by ${actorName}`,
    html,
  });
}

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@markup.app';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
      <div style="background: #2563eb; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Markup</h1>
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

module.exports = { sendInvitationEmail, sendPinNotificationEmail, sendCommentNotificationEmail, sendMentionNotificationEmail, sendPinStatusEmail, sendPasswordResetEmail };
