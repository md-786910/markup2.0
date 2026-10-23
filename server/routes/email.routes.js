const router = require('express').Router();
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { verifyUnsubscribeToken } = require('../utils/unsubscribe');
const { esc } = require('../utils/email/layout');

// Public unsubscribe endpoint for notification emails. GET shows a confirm
// page (link scanners prefetch GETs, so it changes nothing); POST unsubscribes,
// including mail clients' one-click "List-Unsubscribe=One-Click" requests.

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;margin:0;padding:48px 16px;color:#0f172a">
<div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
<h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>${body}</div></body></html>`;
}

router.get('/unsubscribe', (req, res) => {
  const email = verifyUnsubscribeToken(String(req.query.token || ''));
  if (!email) return res.status(400).send(page('Invalid link', '<p>This unsubscribe link is not valid.</p>'));
  res.send(page('Unsubscribe from notification emails?', `
<p style="line-height:1.6">You will stop receiving pin, comment, mention and status emails at <strong>${esc(email)}</strong>. Account and billing emails are still sent.</p>
<form method="post" action="?token=${encodeURIComponent(String(req.query.token))}">
<button type="submit" style="background:#003dff;color:#fff;border:0;border-radius:10px;padding:10px 18px;font-size:14px;cursor:pointer">Unsubscribe</button>
</form>`));
});

router.post('/unsubscribe', asyncHandler(async (req, res) => {
  const email = verifyUnsubscribeToken(String(req.query.token || ''));
  if (!email) return res.status(400).send(page('Invalid link', '<p>This unsubscribe link is not valid.</p>'));
  await User.updateOne({ email }, { $set: { emailNotificationsEnabled: false } });
  res.send(page("You're unsubscribed", '<p style="line-height:1.6">You will no longer receive notification emails. You can turn them back on any time in your profile settings.</p>'));
}));

module.exports = router;
