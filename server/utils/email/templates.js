/**
 * Email templates. Each function is pure: it takes data and returns
 * { subject, html, text } — no sending, so templates can be previewed with
 * `node scripts/previewEmails.js`.
 */
const { renderEmail, clientOrigin, esc } = require('./layout');
const { formatCommentForEmail, stripHtmlAndMentions } = require('../mentionHelper');

// ── Formatting helpers ──────────────────────────────────────────────────────

function pinRef(pinNumber) {
  return pinNumber ? `#${pinNumber}` : '';
}

// "https://acme.com/pricing" → "acme.com/pricing"; "doc:spec.pdf:page:3" → "spec.pdf · Page 3"
function pageLabel(pageUrl) {
  if (!pageUrl) return '';
  const doc = /^doc:(.+):page:(\d+)$/.exec(pageUrl);
  if (doc) return `${doc[1]} · Page ${doc[2]}`;
  return pageUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') || pageUrl;
}

function formatAmount(amount, currency = 'INR') {
  const value = (amount || 0) / 100;
  const code = (currency || 'INR').toUpperCase();
  try {
    return new Intl.NumberFormat(code === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency', currency: code, minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

const dashboardUrl = () => `${clientOrigin()}/dashboard`;
const billingUrl = () => `${clientOrigin()}/settings?tab=billing`;

const projectFooter = (projectName) => ({
  reason: `You're receiving this because you're a member of **${projectName}**.`,
  manage: { label: 'Manage email notifications', url: dashboardUrl() },
});

// ── Collaboration ───────────────────────────────────────────────────────────

function invitation({ inviterName, projectName, signupUrl }) {
  return {
    subject: `${inviterName} invited you to ${projectName} on Kommently`,
    ...renderEmail({
      preheader: `Join ${projectName} and start reviewing with your team.`,
      eyebrow: 'Invitation',
      title: `Join ${projectName} on Kommently`,
      blocks: [
        { type: 'p', text: `**${inviterName}** invited you to review and collaborate on **${projectName}**.` },
        { type: 'p', text: 'Drop pins directly on the page, leave comments, and resolve feedback together — all in one place.', muted: true },
        { type: 'button', label: 'Accept invitation', url: signupUrl, fallback: true },
        { type: 'note', text: 'This invitation expires in 5 days. If you weren\'t expecting it, you can safely ignore this email.' },
      ],
    }),
  };
}

function newPin({ actorName, projectName, pageUrl, pinNumber, link }) {
  const actor = actorName || 'Someone';
  const ref = pinRef(pinNumber);
  return {
    subject: `New feedback${ref ? ` ${ref}` : ''} on ${projectName}`,
    ...renderEmail({
      preheader: `${actor} left new feedback on ${projectName}.`,
      eyebrow: 'New feedback',
      title: `${actor} left new feedback`,
      blocks: [
        { type: 'p', text: `A new pin was added to **${projectName}**.` },
        {
          type: 'details',
          rows: [
            ref && ['Pin', ref, { strong: true }],
            pageUrl && ['Page', pageLabel(pageUrl)],
            ['Added by', actor],
          ],
        },
        { type: 'button', label: 'View feedback', url: link },
      ],
      ...projectFooter(projectName),
    }),
  };
}

function comment({ actorName, projectName, commentBody, pinNumber, link }) {
  const actor = actorName || 'Someone';
  const ref = pinRef(pinNumber);
  const preview = stripHtmlAndMentions(commentBody);
  return {
    subject: `${actor} commented${ref ? ` on ${ref}` : ''} in ${projectName}`,
    ...renderEmail({
      preheader: truncate(`${actor}: ${preview}`, 110),
      eyebrow: 'New comment',
      title: `New comment on ${projectName}`,
      blocks: [
        { type: 'p', text: `**${actor}** replied${ref ? ` on pin **${ref}**` : ''}:` },
        { type: 'quote', author: actor, meta: ref, html: formatCommentForEmail(commentBody), text: preview },
        { type: 'button', label: 'Reply', url: link },
      ],
      ...projectFooter(projectName),
    }),
  };
}

function mention({ actorName, projectName, commentBody, pinNumber, link }) {
  const actor = actorName || 'Someone';
  const ref = pinRef(pinNumber);
  const preview = stripHtmlAndMentions(commentBody);
  return {
    subject: `${actor} mentioned you in ${projectName}`,
    ...renderEmail({
      preheader: truncate(`${actor}: ${preview}`, 110),
      eyebrow: 'Mention',
      title: `${actor} mentioned you`,
      blocks: [
        { type: 'p', text: `You were mentioned in a comment on **${projectName}**${ref ? ` (pin **${ref}**)` : ''}.` },
        { type: 'quote', author: actor, meta: ref, html: formatCommentForEmail(commentBody), text: preview },
        { type: 'button', label: 'Reply', url: link },
      ],
      reason: `You're receiving this because **${actor}** mentioned you.`,
      manage: { label: 'Manage email notifications', url: dashboardUrl() },
    }),
  };
}

function pinStatus({ actorName, projectName, newStatus, pinNumber, link }) {
  const actor = actorName || 'Someone';
  const resolved = newStatus === 'resolved';
  const verb = resolved ? 'resolved' : 'reopened';
  const ref = pinRef(pinNumber);
  return {
    subject: `${actor} ${verb} ${ref || 'feedback'} in ${projectName}`,
    ...renderEmail({
      preheader: `${actor} marked ${ref || 'a pin'} as ${resolved ? 'resolved' : 'open'}.`,
      eyebrow: resolved ? 'Resolved' : 'Reopened',
      tone: resolved ? 'success' : 'warning',
      title: `Feedback${ref ? ` ${ref}` : ''} ${verb}`,
      blocks: [
        { type: 'p', text: `**${actor}** ${verb} ${ref ? `pin **${ref}**` : 'a pin'} on **${projectName}**.` },
        {
          type: 'details',
          rows: [
            ref && ['Pin', ref, { strong: true }],
            ['Status', resolved ? 'Resolved' : 'Open', { strong: true, tone: resolved ? 'success' : 'warning' }],
            ['Updated by', actor],
          ],
        },
        { type: 'button', label: 'View feedback', url: link },
      ],
      ...projectFooter(projectName),
    }),
  };
}

const DIGEST_SECTIONS = [
  { type: 'mention', label: 'Mentions', tone: 'brand' },
  { type: 'comment', label: 'Comments', tone: 'brand' },
  { type: 'pin', label: 'New feedback', tone: 'neutral' },
  { type: 'status', label: 'Status changes', tone: 'success' },
];

function digestItem(ev) {
  const actor = ev.actorName || 'Someone';
  const ref = pinRef(ev.pinNumber);
  const preview = ev.commentBody ? truncate(stripHtmlAndMentions(ev.commentBody), 90) : '';
  switch (ev.type) {
    case 'pin':
      return { text: `**${actor}** added feedback${ref ? ` **${ref}**` : ''}${ev.pinPageUrl ? ` on ${pageLabel(ev.pinPageUrl)}` : ''}`, url: ev.link };
    case 'status':
      return { text: `**${actor}** ${ev.pinStatus === 'resolved' ? 'resolved' : 'reopened'} ${ref ? `**${ref}**` : 'a pin'}`, url: ev.link };
    case 'comment':
      return { text: `**${actor}** commented${ref ? ` on **${ref}**` : ''}`, preview, url: ev.link };
    case 'mention':
      return { text: `**${actor}** mentioned you${ref ? ` on **${ref}**` : ''}`, preview, url: ev.link };
    default:
      return null;
  }
}

function digest({ projectName, events }) {
  const total = events.length;
  const sections = DIGEST_SECTIONS
    .map((s) => ({ ...s, items: events.filter((e) => e.type === s.type).map(digestItem).filter(Boolean) }))
    .filter((s) => s.items.length > 0);
  const summary = sections.map((s) => `${s.items.length} ${s.label.toLowerCase()}`).join(', ');

  return {
    subject: `${plural(total, 'new update')} on ${projectName}`,
    ...renderEmail({
      preheader: `${summary} on ${projectName}.`,
      eyebrow: 'Activity summary',
      title: `${plural(total, 'new update')} on ${projectName}`,
      blocks: [
        { type: 'p', text: 'Here\'s what your team has been up to since your last update.', muted: true },
        { type: 'digest', sections },
        { type: 'button', label: 'Open project', url: events[0]?.link || dashboardUrl() },
      ],
      ...projectFooter(projectName),
    }),
  };
}

// ── Account ─────────────────────────────────────────────────────────────────

function adminInvite({ name, inviterName, setPasswordUrl }) {
  return {
    subject: `${inviterName} added you to the Kommently admin team`,
    ...renderEmail({
      preheader: 'Set your password to open the admin panel. The link works for 72 hours.',
      eyebrow: 'Admin team',
      tone: 'neutral',
      title: `Welcome to the admin team, ${name}`,
      blocks: [
        { type: 'p', text: `**${inviterName}** gave you access to the Kommently admin panel, where we manage customers, plans and billing.` },
        { type: 'button', label: 'Set your password', url: setPasswordUrl, fallback: true },
        { type: 'note', text: 'This link works for **72 hours**. After setting your password you will turn on two-step sign-in with an authenticator app on your phone.' },
      ],
    }),
  };
}


function passwordReset({ resetUrl, expiresIn = '1 hour' }) {
  return {
    subject: 'Reset your Kommently password',
    ...renderEmail({
      preheader: `Use this link to choose a new password. It expires in ${expiresIn}.`,
      eyebrow: 'Security',
      tone: 'neutral',
      title: 'Reset your password',
      blocks: [
        { type: 'p', text: 'We received a request to reset the password for your Kommently account. Click below to choose a new one.' },
        { type: 'button', label: 'Reset password', url: resetUrl, fallback: true },
        { type: 'note', text: `This link expires in **${expiresIn}**. If you didn't request a reset, you can ignore this email — your password won't change.` },
      ],
    }),
  };
}

function verificationOtp({ otp }) {
  return {
    subject: `${otp} is your Kommently verification code`,
    ...renderEmail({
      preheader: `Your verification code is ${otp}. It expires in 10 minutes.`,
      eyebrow: 'Verify email',
      tone: 'neutral',
      title: 'Confirm your email address',
      blocks: [
        { type: 'p', text: 'Enter this code to finish creating your Kommently workspace.' },
        { type: 'code', value: otp, caption: 'Expires in 10 minutes' },
        { type: 'note', text: 'Never share this code with anyone. If you didn\'t try to sign up, you can safely ignore this email.' },
      ],
    }),
  };
}

// Website contact form → support inbox (reply goes to the sender)
function supportRequest({ name, email, topic, message }) {
  return {
    subject: `[Support] ${topic} from ${name}`,
    ...renderEmail({
      preheader: `${name} (${email}) wrote about ${topic}.`,
      eyebrow: 'Website contact form',
      tone: 'neutral',
      title: topic,
      blocks: [
        { type: 'details', rows: [['From', name], ['Email', email], ['Topic', topic]] },
        { type: 'quote', author: name, meta: email, html: esc(message).replace(/\n/g, '<br>'), text: message },
        { type: 'note', text: 'Reply to this email to answer the sender directly.' },
      ],
    }),
  };
}

// ── Billing ─────────────────────────────────────────────────────────────────

const billingFooter = (orgName) => ({
  reason: `You're receiving this as the owner of **${orgName}**.`,
  manage: { label: 'View billing', url: billingUrl() },
});

function invoiceCreated({ orgName, planName, amount, currency, dueAt, payUrl }) {
  const total = formatAmount(amount, currency);
  const due = formatDate(dueAt);
  return {
    subject: `Your Kommently invoice for ${orgName} — ${total} due ${due}`,
    ...renderEmail({
      preheader: `${total} for the ${planName} plan, due ${due}.`,
      eyebrow: 'Invoice',
      title: 'Your monthly invoice is ready',
      blocks: [
        { type: 'p', text: `Thanks for using Kommently! Here's the invoice for **${orgName}**.` },
        {
          type: 'details',
          rows: [
            ['Workspace', orgName],
            ['Plan', `${planName} · Monthly`],
            ['Due date', due],
            ['Amount due', total, { strong: true }],
          ],
        },
        { type: 'button', label: 'Pay invoice', url: payUrl },
        { type: 'note', text: 'Pay before the due date to keep your workspace active for your whole team.' },
      ],
      ...billingFooter(orgName),
    }),
  };
}

function paymentReminder({ orgName, daysLeft, amount, currency, payUrl }) {
  const total = formatAmount(amount, currency);
  const days = plural(daysLeft, 'day');
  return {
    subject: `Reminder: ${total} due in ${days} — ${orgName}`,
    ...renderEmail({
      preheader: `Your invoice for ${orgName} is due in ${days}.`,
      eyebrow: 'Payment reminder',
      tone: 'warning',
      title: 'Your invoice is due soon',
      blocks: [
        { type: 'p', text: `A friendly reminder that the invoice for **${orgName}** is still unpaid.` },
        {
          type: 'details',
          rows: [
            ['Workspace', orgName],
            ['Time left', days, { tone: 'warning', strong: true }],
            ['Amount due', total, { strong: true }],
          ],
        },
        { type: 'button', label: 'Pay now', url: payUrl },
        { type: 'note', text: 'Already paid? Thanks — you can ignore this email.' },
      ],
      ...billingFooter(orgName),
    }),
  };
}

function urgentPaymentReminder({ orgName, daysLeft, amount, currency, payUrl }) {
  const total = formatAmount(amount, currency);
  const days = plural(daysLeft, 'day');
  return {
    subject: `Action needed: ${orgName} will be locked in ${days}`,
    ...renderEmail({
      preheader: `Pay ${total} within ${days} to keep your workspace active.`,
      eyebrow: 'Action needed',
      tone: 'danger',
      title: 'Pay now to avoid losing access',
      blocks: [
        { type: 'callout', tone: 'danger', text: `**${orgName}** will be locked in **${days}** if the invoice remains unpaid.` },
        { type: 'p', text: 'Once locked, your team can still sign in, but won\'t be able to add feedback, comments or projects until payment is received.' },
        {
          type: 'details',
          rows: [
            ['Workspace', orgName],
            ['Time left', days, { tone: 'danger', strong: true }],
            ['Amount due', total, { strong: true }],
          ],
        },
        { type: 'button', label: 'Pay now', url: payUrl, tone: 'danger' },
      ],
      ...billingFooter(orgName),
    }),
  };
}

function orgLocked({ orgName, amount, currency, payUrl }) {
  const total = formatAmount(amount, currency);
  return {
    subject: `${orgName} is locked — pay to restore access`,
    ...renderEmail({
      preheader: `Your workspace is locked because ${total} is overdue.`,
      eyebrow: 'Workspace locked',
      tone: 'danger',
      title: `${orgName} has been locked`,
      blocks: [
        { type: 'callout', tone: 'danger', text: `Your invoice of **${total}** is overdue, so the workspace is now read-only.` },
        { type: 'p', text: 'Your team can still sign in and view projects, but new feedback, comments and changes are paused. Pay the outstanding invoice and access is restored **instantly**.' },
        {
          type: 'details',
          rows: [
            ['Workspace', orgName],
            ['Status', 'Locked', { tone: 'danger', strong: true }],
            ['Amount overdue', total, { strong: true }],
          ],
        },
        { type: 'button', label: 'Pay & unlock workspace', url: payUrl, tone: 'danger' },
      ],
      ...billingFooter(orgName),
    }),
  };
}

function paymentReceipt({ orgName, planName, amount, currency, invoiceNumber, periodEnd, invoicesUrl }) {
  const total = formatAmount(amount, currency);
  return {
    subject: `Payment received — ${total} for ${orgName}`,
    ...renderEmail({
      preheader: `Thanks! Your ${planName} plan is active until ${formatDate(periodEnd)}.`,
      eyebrow: 'Receipt',
      tone: 'success',
      title: 'Thanks for your payment',
      blocks: [
        { type: 'p', text: `We received your payment for **${orgName}**. Your invoice is ready to download.` },
        {
          type: 'details',
          rows: [
            ['Invoice', invoiceNumber || '—'],
            ['Plan', `${planName} · Monthly`],
            ['Paid until', formatDate(periodEnd)],
            ['Amount paid', total, { strong: true }],
          ],
        },
        { type: 'button', label: 'Download invoice', url: invoicesUrl },
      ],
      ...billingFooter(orgName),
    }),
  };
}

function paymentFailed({ orgName, amount, currency, payUrl }) {
  const total = formatAmount(amount, currency);
  return {
    subject: `Payment failed — ${orgName}`,
    ...renderEmail({
      preheader: `Your payment of ${total} didn't go through.`,
      eyebrow: 'Payment failed',
      tone: 'warning',
      title: "Your payment didn't go through",
      blocks: [
        { type: 'p', text: `We couldn't complete your payment of **${total}** for **${orgName}**. No money was taken. Please try again, or use a different payment method.` },
        { type: 'button', label: 'Try again', url: payUrl },
        { type: 'note', text: 'If this keeps happening, your bank may have declined the charge. Contact your bank or reply to this email.' },
      ],
      ...billingFooter(orgName),
    }),
  };
}

function subscriptionCanceled({ orgName, planName, endsAt, planUrl }) {
  const ends = formatDate(endsAt);
  return {
    subject: `Your ${planName} plan is cancelled — ${orgName}`,
    ...renderEmail({
      preheader: `You keep ${planName} until ${ends}. You won't be charged again.`,
      eyebrow: 'Subscription cancelled',
      tone: 'neutral',
      title: 'Your subscription is cancelled',
      blocks: [
        { type: 'p', text: `**${orgName}** keeps the ${planName} plan until **${ends}**. After that it moves to the Free plan and you won't be charged again. Your projects and comments are kept.` },
        { type: 'button', label: 'Keep my subscription', url: planUrl },
        { type: 'note', text: 'Changed your mind? You can resume any time before the end date.' },
      ],
      ...billingFooter(orgName),
    }),
  };
}

// ── Trial ───────────────────────────────────────────────────────────────────

function trialEnding({ orgName, daysLeft, endsAt, planUrl }) {
  const days = plural(daysLeft, 'day');
  const ends = formatDate(endsAt);
  const urgent = daysLeft <= 1;
  return {
    subject: urgent
      ? `Last day of your Kommently trial — ${orgName}`
      : `Your Kommently trial ends in ${days} — ${orgName}`,
    ...renderEmail({
      preheader: `Choose a plan before ${ends} to keep ${orgName} active.`,
      eyebrow: 'Free trial',
      tone: urgent ? 'warning' : 'neutral',
      title: urgent ? 'Your trial ends tomorrow' : `Your trial ends in ${days}`,
      blocks: [
        { type: 'p', text: `Your free trial of **${orgName}** ends on **${ends}**. Add your payment details and choose a plan to keep your projects, pins and comments available to your team.` },
        {
          type: 'details',
          rows: [
            ['Workspace', orgName],
            ['Trial ends', ends, { tone: urgent ? 'warning' : undefined, strong: true }],
          ],
        },
        { type: 'button', label: 'Choose a plan', url: planUrl },
        { type: 'note', text: 'If you don\'t choose a plan, the workspace is locked when the trial ends. Your data is kept and access comes back as soon as you subscribe.' },
      ],
      ...billingFooter(orgName),
    }),
  };
}

function trialExpired({ orgName, planUrl }) {
  return {
    subject: `Your Kommently trial has ended — ${orgName} is locked`,
    ...renderEmail({
      preheader: `Choose a plan to unlock ${orgName}.`,
      eyebrow: 'Trial ended',
      tone: 'danger',
      title: `${orgName} has been locked`,
      blocks: [
        { type: 'callout', tone: 'danger', text: 'Your free trial has ended, so the workspace is now read-only.' },
        { type: 'p', text: 'Your team can still sign in and view projects, but new feedback, comments and changes are paused. Choose a plan and access is restored **instantly** — nothing has been deleted.' },
        { type: 'button', label: 'Choose a plan & unlock', url: planUrl, tone: 'danger' },
      ],
      ...billingFooter(orgName),
    }),
  };
}

module.exports = {
  supportRequest,
  invitation,
  newPin,
  comment,
  mention,
  pinStatus,
  digest,
  passwordReset,
  adminInvite,
  verificationOtp,
  invoiceCreated,
  paymentReminder,
  urgentPaymentReminder,
  orgLocked,
  trialEnding,
  trialExpired,
  paymentReceipt,
  paymentFailed,
  subscriptionCanceled,
  formatAmount,
};
