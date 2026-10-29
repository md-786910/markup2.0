// Email link check: runs real flows (forgot password, invitation, comment
// notification, trial reminder, payment receipt, support request and reply)
// and verifies every link in
// every email points to the configured environment and to a page that exists.
//   node test/emailLinks.js live|local      (part of npm test)
// Uses a throwaway database (dropped) and captures email instead of sending it.
const path = require('path');
const SERVER = path.join(__dirname, '..');
const MODE = process.argv[2] || 'live';
const ENVS = {
  live: { API_URL: 'https://api.kommently.info', APP_URL: 'https://app.kommently.info', ADMIN_URL: 'https://admin.kommently.info', SITE_URL: 'https://kommently.info' },
  local: { API_URL: 'http://localhost:5000', APP_URL: 'http://localhost:8081', ADMIN_URL: 'http://localhost:8082', SITE_URL: 'http://localhost:8083' },
};
Object.assign(process.env, ENVS[MODE], {
  MONGODB_URI: process.env.TEST_MONGODB_URI_LINKS || 'mongodb://localhost:27017/kommently_links_test',
  JWT_SECRET: 'links-test-secret-'.padEnd(48, 'x'),
  EMAIL_BATCH_DELAY_MS: '200', REDIS_URL: '', SENTRY_DSN: '',
});
const r = (m) => require(path.join(SERVER, m));
const nodemailer = require('nodemailer');
const sent = [];
nodemailer.createTransport = () => ({ sendMail: async (m) => { sent.push(m); } });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Client routes (client/src/App.js) and the query params each page reads
const CLIENT_ROUTES = [/^\/reset-password\/[^/]+$/, /^\/signup$/, /^\/project\/[a-f0-9]{24}$/, /^\/settings$/, /^\/dashboard$/, /^\/login$/, /^\/?$/];
const SETTINGS_TABS = ['workspace', 'billing', 'invoices', 'activity'];
// Admin panel routes (admin/src/App.js) linked from team emails
const ADMIN_ROUTES = [/^\/support\/[a-f0-9]{24}$/];
let pass = 0, fail = 0;
const check = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); };

function linksOf(mail) {
  const set = new Set();
  for (const m of (mail.html || '').matchAll(/href="([^"]+)"/g)) set.add(m[1].replace(/&amp;/g, '&'));
  for (const m of (mail.text || '').matchAll(/https?:\/\/[^\s)>\]]+/g)) set.add(m[0]);
  if (mail.headers?.['List-Unsubscribe']) set.add(mail.headers['List-Unsubscribe'].slice(1, -1));
  return [...set].filter((l) => !l.startsWith('mailto:'));
}

// Every link must go to the app or the API of THIS environment (customer pages excepted)
function verifyMail(mail, externalOk = []) {
  const { APP_URL, API_URL, ADMIN_URL } = ENVS[MODE];
  for (const link of linksOf(mail)) {
    if (externalOk.some((e) => link.startsWith(e))) continue;
    const u = new URL(link);
    if (link.startsWith(APP_URL + '/') || link === APP_URL) {
      const okRoute = CLIENT_ROUTES.some((re) => re.test(u.pathname));
      const okTab = u.pathname !== '/settings' || SETTINGS_TABS.includes(u.searchParams.get('tab'));
      check(`"${mail.subject.slice(0, 48)}" → app ${u.pathname}${u.search.slice(0, 12)}`, okRoute && okTab, okRoute ? '' : 'no such page');
    } else if (link.startsWith(ADMIN_URL + '/')) {
      check(`"${mail.subject.slice(0, 48)}" → admin ${u.pathname}`, ADMIN_ROUTES.some((re) => re.test(u.pathname)), 'no such admin page');
    } else if (link.startsWith(API_URL + '/')) {
      check(`"${mail.subject.slice(0, 48)}" → api ${u.pathname}`, u.pathname === '/api/email/unsubscribe');
    } else {
      check(`"${mail.subject.slice(0, 48)}" link stays in ${MODE}`, false, link);
    }
  }
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  if (!mongoose.connection.name.endsWith('_test')) throw new Error('test database name must end in _test');
  await mongoose.connection.dropDatabase();
  const User = r('models/User'), Org = r('models/Organization'), Project = r('models/Project'), Pin = r('models/Pin'), Invoice = r('models/Invoice');
  const mk = (name, role) => User.create({ name, email: `${name}@links.test`, passwordHash: 'Passw0rd!x', role, sessionToken: name });
  const owner = await mk('owner', 'owner'); const member = await mk('member', 'member');
  const org = await Org.create({ name: 'Links Co', slug: 'links-co', owner: owner._id, plan: 'trial', trialEndsAt: new Date(Date.now() + 2.5 * 864e5) });
  for (const u of [owner, member]) { u.organization = org._id; await u.save({ validateBeforeSave: false }); }
  const project = await Project.create({ name: 'Site', projectType: 'website', websiteUrl: 'https://customer-site.example.com', owner: owner._id, organization: org._id, members: [owner._id, member._id] });
  const pin = await Pin.create({ project: project._id, pageUrl: 'https://customer-site.example.com/pricing', xPercent: 1, yPercent: 1, pinNumber: 1, createdBy: member._id });
  const tok = (u) => jwt.sign({ id: u._id, role: u.role, sessionToken: u.sessionToken }, process.env.JWT_SECRET, { algorithm: 'HS256' });

  const app = r('app'); const srv = app.listen(0); const base = `http://127.0.0.1:${srv.address().port}`;
  const call = (method, url, body, user) => fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${tok(user)}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  const take = () => sent.splice(0);
  console.log(`--- ${MODE}: APP_URL=${ENVS[MODE].APP_URL} API_URL=${ENVS[MODE].API_URL}`);

  // 1. Forgot password → link opens the reset page → token resets the password
  await call('POST', '/api/auth/forgot-password', { email: 'owner@links.test' });
  await wait(300);
  const [reset] = take();
  check('forgot-password email sent', !!reset);
  verifyMail(reset);
  const resetLink = linksOf(reset).find((l) => l.includes('/reset-password/'));
  const resetToken = resetLink && new URL(resetLink).pathname.split('/').pop();
  check('reset link token resets the password', (await call('POST', `/api/auth/reset-password/${resetToken}`, { password: 'BrandNew1234' })).status === 200);
  // A password reset signs out other sessions: continue with the owner's new session
  Object.assign(owner, await User.findById(owner._id).select('sessionToken role'));

  // 2. Invitation → signup link carries a valid invitation token
  await call('POST', `/api/projects/${project._id}/members`, { email: 'newbie@links.test', role: 'member' }, owner);
  await wait(300);
  const [invite] = take();
  check('invitation email sent', !!invite);
  verifyMail(invite);
  const inviteToken = new URL(linksOf(invite).find((l) => l.includes('/signup'))).searchParams.get('token');
  check('signup link token is a valid invitation', (await call('GET', `/api/invitations/${inviteToken}`)).status === 200);

  // 3. Comment notification → pin deep link + working unsubscribe link
  await call('POST', `/api/pins/${pin._id}/comments`, { body: '<p>Please fix the header</p>' }, member);
  await wait(800);
  const notes = take();
  check('comment notification email sent to the owner', notes.some((m) => m.to === 'owner@links.test'));
  for (const m of notes) verifyMail(m, ['https://customer-site.example.com']);
  const pinLink = notes.flatMap(linksOf).find((l) => l.includes('/project/'));
  check('pin link opens the right project and pin', !!pinLink && new URL(pinLink).pathname === `/project/${project._id}` && new URL(pinLink).searchParams.get('pin') === String(pin._id));
  const unsub = notes.flatMap(linksOf).find((l) => l.includes('/api/email/unsubscribe'));
  const unsubPath = unsub && new URL(unsub).pathname + new URL(unsub).search;
  check('unsubscribe link works on the API', !!unsub && (await fetch(base + unsubPath)).status === 200);

  // 4. Trial reminder (daily job) → billing page
  await r('scripts/runBilling').runBilling();
  const trial = take();
  check('trial reminder email sent', trial.some((m) => /trial/i.test(m.subject)));
  for (const m of trial) verifyMail(m);

  // 5. Payment receipt → invoices page
  const inv = await Invoice.create({ organization: org._id, plan: 'pro', amount: 2900, currency: 'USD', status: 'pending', provider: 'paypal' });
  await r('payments/settleInvoice').settleInvoice(inv._id, {});
  await wait(300);
  const receipt = take();
  check('payment receipt email sent', receipt.some((m) => /payment received/i.test(m.subject)));
  for (const m of receipt) verifyMail(m);

  // 6. Support request → team email opens it in the admin panel; our reply →
  //    customer email opens it in the app (/dashboard?support=<id>)
  process.env.SUPPORT_EMAIL = 'support@links.test';
  const created = await (await call('POST', '/api/support/tickets', { subject: 'Pins do not save', category: 'bug', body: 'Clicking Post does nothing on the pricing page.' }, member)).json();
  const ticketId = created.ticket?._id;
  await wait(300);
  const teamMail = take().find((m) => m.to === 'support@links.test');
  check('support request email sent to the team', !!teamMail);
  if (teamMail) verifyMail(teamMail);
  check('team email opens the request in the admin panel', !!teamMail && linksOf(teamMail).some((l) => l === `${ENVS[MODE].ADMIN_URL}/support/${ticketId}`));
  const AdminUser = r('models/AdminUser');
  const admin = await AdminUser.create({ name: 'Links Admin', email: 'admin@links.test', passwordHash: 'a-long-test-password', status: 'active', sessionToken: 'links-admin', twoFactor: { enabled: true } });
  const adminToken = r('utils/adminSession').signAdminToken(admin);
  await fetch(`${base}/api/admin/support/tickets/${ticketId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ body: 'Fixed, please try again.' }) });
  await wait(300);
  const replyMail = take().find((m) => m.to === 'member@links.test');
  check('support reply email sent to the customer', !!replyMail);
  if (replyMail) verifyMail(replyMail);
  const replyLink = replyMail && linksOf(replyMail).find((l) => l.includes('support='));
  check('reply link opens the request in the app', !!replyLink && new URL(replyLink).pathname === '/dashboard' && new URL(replyLink).searchParams.get('support') === String(ticketId));
  delete process.env.SUPPORT_EMAIL;

  console.log(`\n${MODE}: ${pass} passed, ${fail} failed`);
  srv.close(); await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('ERROR', e); try { await mongoose.connection.dropDatabase(); } catch {} process.exit(2); });
