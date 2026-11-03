// Proxy and pin-capture checks that need a local upstream site, so the app
// starts with PROXY_ALLOW_PRIVATE=true (smoke.js keeps it off for its SSRF checks).
//   TEST_MONGODB_URI=mongodb://localhost:27017/kommently_proxy_test node test/proxyPassthrough.js
// The database is DROPPED before and after, so its name must end in "_test".
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/kommently_proxy_test';
process.env.PROXY_ALLOW_PRIVATE = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'proxy-test-secret-'.padEnd(48, 'x');
process.env.REDIS_URL = '';
process.env.SENTRY_DSN = '';
process.env.FALLBACK_RELAY_URL = '';

const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const r = (m) => require(path.join(__dirname, '..', m));

let pass = 0, fail = 0;
const check = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); };

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  if (!mongoose.connection.name.endsWith('_test')) throw new Error(`Refusing to drop "${mongoose.connection.name}": test database name must end in _test`);
  await mongoose.connection.dropDatabase();

  // A tiny customer site: a page, an API that answers 404 and one that answers 401
  const site = http.createServer((req, res) => {
    if (req.url.startsWith('/api/missing')) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end('{"error":"not found"}'); }
    if (req.url.startsWith('/api/private')) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end('{"error":"login"}'); }
    if (req.url.startsWith('/gone')) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end('<html><head></head><body>Gone</body></html>'); }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><head><title>Site</title></head><body><button class="nav-link">Buy</button></body></html>');
  });
  await new Promise((res) => site.listen(0, '127.0.0.1', res));
  const siteUrl = `http://127.0.0.1:${site.address().port}`;

  const User = r('models/User'), Organization = r('models/Organization'), Project = r('models/Project');
  const owner = await User.create({ name: 'Owner', email: 'owner@proxy.test', passwordHash: 'Passw0rd!x', role: 'owner', sessionToken: 's1' });
  const org = await Organization.create({ name: 'Proxy Co', slug: 'proxy-co', owner: owner._id, plan: 'trial', trialEndsAt: new Date(Date.now() + 9e8) });
  owner.organization = org._id; await owner.save({ validateBeforeSave: false });
  const project = await Project.create({ name: 'Site', projectType: 'website', websiteUrl: `${siteUrl}/`, owner: owner._id, organization: org._id, members: [owner._id] });
  const token = r('utils/proxyToken').signProxyToken(owner, project._id);

  const app = r('app');
  const srv = app.listen(0);
  await new Promise((res) => (srv.listening ? res() : srv.once('listening', res)));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const proxied = (target) => fetch(`${base}/api/proxy?url=${encodeURIComponent(target)}&projectId=${project._id}&token=${token}`);

  // The site's own status codes pass through the proxy
  const page = await proxied(`${siteUrl}/`);
  const html = await page.text();
  check('a proxied page answers 200', page.status === 200, page.status);
  check('a 404 from the site stays 404 through the proxy', (await proxied(`${siteUrl}/api/missing?x=1`)).status === 404);
  check('a 401 from the site stays 401 through the proxy', (await proxied(`${siteUrl}/api/private`)).status === 401);
  const gone = await proxied(`${siteUrl}/gone`);
  check('a 404 page still renders, with the overlay script, as 404', gone.status === 404 && /__markupDiag/.test(await gone.text()));

  // The injected script reaches the browser with its regexes intact
  check('element text collapses whitespace (/\\s+/g reaches the browser)', html.includes(".replace(/\\s+/g, ' ')") && !html.includes('.replace(/s+/g'));
  check('selector class filter keeps word characters ([\\w-] reaches the browser)', html.includes('[a-zA-Z][\\w-]{2,}') && !html.includes('[a-zA-Z][w-]{2,}'));

  // Captured console errors keep no tokens or query strings
  const { sanitizePinContext } = r('utils/pinContext');
  const ctx = sanitizePinContext({ consoleErrors: [{ level: 'error', message: `TypeError: x\n    at ${base}/api/proxy?url=${encodeURIComponent(`${siteUrl}/app.js?v=2`)}&projectId=${project._id}&token=${token}:12:5\n    at https://cdn.example.com/lib.js?rt=RELAY#frag:3:1 then token=abc` }] }, {});
  const msg = ctx.consoleErrors[0].message;
  check('console errors keep no proxy or relay token', !msg.includes(token) && !/rt=RELAY/.test(msg) && !/token=abc/.test(msg), msg.replace(/\n/g, ' | '));
  check('console errors point at the real script with line and column', msg.includes(`${siteUrl}/app.js:12:5`) && msg.includes('https://cdn.example.com/lib.js:3:1'), msg.replace(/\n/g, ' | '));

  console.log(`\n${pass} passed, ${fail} failed`);
  srv.close(); site.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('ERROR', e); try { await mongoose.connection.dropDatabase(); } catch {} process.exit(2); });
