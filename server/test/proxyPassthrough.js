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
    if (req.url.startsWith('/api/echo')) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ authorization: req.headers.authorization || null, cookie: req.headers.cookie || '' })); }
    if (req.url.startsWith('/login')) { res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': 'sess=xyz; Domain=example.com; Path=/app; Secure; HttpOnly' }); return res.end('{}'); }
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

  // A reviewed site's mirrored token goes back only to that site; our cookies never leave
  const echo = async (cookie) => (await fetch(`${base}/api/proxy?url=${encodeURIComponent(`${siteUrl}/api/echo`)}&projectId=${project._id}&token=${token}`, { headers: { Cookie: cookie } })).json();
  // Site cookies live under the site's prefix in the proxy origin's cookie jar
  const own = await echo('__markup_ls_127.0.0.1__authToken=site-own; __mkc_127.0.0.1__site_session=abc; markup_csrf=c; markup_token=t');
  check('a mirrored token is forwarded to the site that stored it', own.authorization === 'Bearer site-own', JSON.stringify(own));
  check('our own cookies are never forwarded to the site', own.cookie === 'site_session=abc', own.cookie);
  const crossSite = await echo('__mkc_other-client.com__session=theirs; legacy_unprefixed=1; __mkc_127.0.0.1__mine=1');
  check('another site\x27s cookies (and unprefixed ones) are not forwarded', crossSite.cookie === 'mine=1', crossSite.cookie);
  const login = await proxied(`${siteUrl}/login`);
  const setCookie = login.headers.get('set-cookie') || '';
  check('a site\x27s Set-Cookie is stored under its prefix, HttpOnly kept, on Path=/',
    setCookie.startsWith('__mkc_127.0.0.1__sess=xyz') && /HttpOnly/i.test(setCookie) && /Path=\/(;|$)/.test(setCookie) && !/Domain=/i.test(setCookie) && !/Path=\/app/.test(setCookie), setCookie);
  check('the page gets the per-site document.cookie wrapper', html.includes('__markupRawCookie') && html.includes('__mkc_127.0.0.1__'));
  check('the proxy context cookie is HttpOnly', /__markup_proxy_ctx=.*HttpOnly/i.test(page.headers.get('set-cookie') || ''), page.headers.get('set-cookie'));
  const { siteKey } = r('utils/proxyRewriter');
  check('customer apps on a shared hosting platform are separate sites', siteKey('a.vercel.app') !== siteKey('b.vercel.app') && siteKey('x.a.netlify.app') === siteKey('a.netlify.app') && siteKey('www.example.co.uk') === 'example.co.uk');
  const other = await echo('__markup_ls_other-client.com__authToken=other-site; __markup_ls_authToken=legacy-unscoped');
  check('another site\'s mirrored token is not forwarded', other.authorization === null, JSON.stringify(other));

  // Share links: the guest proxy opens the project's own site; other sites only
  // from inside a proxied page (same-origin requests)
  const shared = await Project.create({ name: 'Shared', projectType: 'website', websiteUrl: `${siteUrl}/`, owner: owner._id, organization: org._id, members: [owner._id], shareSettings: { enabled: true, token: 'guest-proxy-test', allowComments: true } });
  const offSite = siteUrl.replace('127.0.0.1', 'localhost');
  const guest = (target, headers = {}, method = 'GET') => fetch(`${base}/api/proxy?url=${encodeURIComponent(target)}&projectId=${shared._id}&guest=true`, { method, headers, redirect: 'manual' });
  const ownSite = await guest(`${siteUrl}/`, { Accept: 'text/html' });
  check('guest: the project\x27s own site loads', ownSite.status === 200, `${ownSite.status} ${ownSite.status !== 200 ? await ownSite.text() : ''}`);
  check('guest: another site opened from outside (link, other site) is refused', (await guest(`${offSite}/`, { Accept: 'text/html', 'Sec-Fetch-Site': 'none' })).status === 403);
  check('guest: another site from a non-browser client is refused', (await guest(`${offSite}/`, { Accept: 'text/html' })).status === 403);
  check('guest: a form post to another site from outside is refused', (await guest(`${offSite}/api/echo`, {}, 'POST')).status === 403);
  check('guest: another site from inside a proxied page still loads', (await guest(`${offSite}/`, { Accept: 'text/html', 'Sec-Fetch-Site': 'same-origin' })).status === 200);

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
