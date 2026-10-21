/**
 * Render every email template with sample data — nothing is sent.
 *
 *   node scripts/previewEmails.js [outDir]     (default: ./email-previews)
 *
 * Writes one .html and .txt per template plus an index.html to browse them.
 */
const fs = require('fs');
const path = require('path');
const t = require('../utils/email/templates');
const { URLS } = require('../config/env');

const outDir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'email-previews'));
const APP = URLS.app;
const link = `${APP}/project/6650c0ffee/?pin=665abc`;
const commentBody = '<p>Hey <span class="mention" data-id="6ad602c47513f58c26b355f3" data-value="Frederik">@Frederik</span>, the hero headline wraps awkwardly on tablet. Can we tighten the copy to <strong>"Ship feedback faster"</strong>?</p>';
const dueAt = new Date(Date.now() + 10 * 86400000);

const samples = {
  invitation: t.invitation({ inviterName: 'Ashif Reza', projectName: 'AM Pioneer Website', signupUrl: `${APP}/signup?token=3f9a1c7e2b` }),
  'new-pin': t.newPin({ actorName: 'Frederik Nußbaumer', projectName: 'AM Pioneer Website', pageUrl: 'https://am-pioneers.com/x160pro/', pinNumber: 178, link }),
  comment: t.comment({ actorName: 'Frederik Nußbaumer', projectName: 'AM Pioneer Website', commentBody, pinNumber: 177, link }),
  mention: t.mention({ actorName: 'Sohail Amir', projectName: 'AM Pioneer Website', commentBody, pinNumber: 175, link }),
  'pin-resolved': t.pinStatus({ actorName: 'Ashif Reza', projectName: 'AM Pioneer Website', newStatus: 'resolved', pinNumber: 174, link }),
  'pin-reopened': t.pinStatus({ actorName: 'Ashif Reza', projectName: 'AM Pioneer Website', newStatus: 'pending', pinNumber: 174, link }),
  digest: t.digest({
    projectName: 'AM Pioneer Website',
    events: [
      { type: 'mention', actorName: 'Sohail Amir', commentBody, pinNumber: 175, link },
      { type: 'comment', actorName: 'Frederik Nußbaumer', commentBody: '<p>Please link the following page to the button: am-pioneers.com/desktop-metal-studio/</p>', pinNumber: 177, link },
      { type: 'comment', actorName: 'Frederik Nußbaumer', commentBody: '<p>Please change to X160Pro</p>', pinNumber: 178, link },
      { type: 'pin', actorName: 'Frederik Nußbaumer', pinPageUrl: 'https://am-pioneers.com/bmf/', pinNumber: 179, link },
      { type: 'status', actorName: 'Ashif Reza', pinStatus: 'resolved', pinNumber: 170, link },
    ],
  }),
  'password-reset': t.passwordReset({ resetUrl: `${APP}/reset-password/9c1f0a3e7d2b4c58a6e1` }),
  'verification-otp': t.verificationOtp({ otp: '482913' }),
  'invoice-created': t.invoiceCreated({ orgName: 'Acme Inc', planName: 'Starter', amount: 100800, currency: 'INR', dueAt, payUrl: `${APP}/settings?tab=invoices` }),
  'invoice-created-usd': t.invoiceCreated({ orgName: 'Acme Inc', planName: 'Pro', amount: 2900, currency: 'USD', dueAt, payUrl: `${APP}/settings?tab=invoices` }),
  'payment-reminder': t.paymentReminder({ orgName: 'Acme Inc', daysLeft: 6, amount: 100800, currency: 'INR', payUrl: `${APP}/settings?tab=invoices` }),
  'payment-urgent': t.urgentPaymentReminder({ orgName: 'Acme Inc', daysLeft: 1, amount: 100800, currency: 'INR', payUrl: `${APP}/settings?tab=invoices` }),
  'org-locked': t.orgLocked({ orgName: 'Acme Inc', amount: 100800, currency: 'INR', payUrl: `${APP}/settings?tab=invoices` }),
  'trial-ending-7': t.trialEnding({ orgName: 'Acme Inc', daysLeft: 7, endsAt: dueAt, planUrl: `${APP}/settings?tab=billing` }),
  'trial-ending-1': t.trialEnding({ orgName: 'Acme Inc', daysLeft: 1, endsAt: dueAt, planUrl: `${APP}/settings?tab=billing` }),
  'trial-expired': t.trialExpired({ orgName: 'Acme Inc', planUrl: `${APP}/settings?tab=billing` }),
  'payment-receipt': t.paymentReceipt({ orgName: 'Acme Inc', planName: 'Pro', amount: 243600, currency: 'INR', invoiceNumber: 'INV-2627-000042', periodEnd: dueAt, invoicesUrl: `${APP}/settings?tab=invoices` }),
  'payment-failed': t.paymentFailed({ orgName: 'Acme Inc', amount: 2900, currency: 'USD', payUrl: `${APP}/settings?tab=invoices` }),
  'subscription-canceled': t.subscriptionCanceled({ orgName: 'Acme Inc', planName: 'Pro', endsAt: dueAt, planUrl: `${APP}/settings?tab=billing` }),
};

fs.mkdirSync(outDir, { recursive: true });
const rows = [];
for (const [name, email] of Object.entries(samples)) {
  fs.writeFileSync(path.join(outDir, `${name}.html`), email.html);
  fs.writeFileSync(path.join(outDir, `${name}.txt`), `Subject: ${email.subject}\n\n${email.text}\n`);
  rows.push(`<li><a href="${name}.html">${name}</a> — ${email.subject.replace(/</g, '&lt;')} (<a href="${name}.txt">text</a>)</li>`);
}
fs.writeFileSync(
  path.join(outDir, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Email previews</title><body style="font-family:sans-serif;padding:24px"><h1>Email previews</h1><ul>${rows.join('')}</ul></body>`
);
console.log(`Wrote ${rows.length} previews to ${outDir}`);
