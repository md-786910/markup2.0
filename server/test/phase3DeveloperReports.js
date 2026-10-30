// Tests for Phase 3: Developer-ready reports
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/kommently_smoke_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase3-test-secret-'.padEnd(48, 'x');

const path = require('path');
const r = (m) => require(path.join(__dirname, '..', m));
const mongoose = require('mongoose');

const { parseUserAgent, cleanUrl, extractRealUrl, sanitizePinContext } = r('utils/pinContext');
const { injectScript } = r('utils/proxyRewriter');
const Pin = r('models/Pin');
const Project = r('models/Project');
const Organization = r('models/Organization');
const User = r('models/User');

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
}

(async () => {
  console.log('=== Phase 3: Developer-Ready Reports Tests ===\n');

  // --- 1. User Agent Parsing ---
  const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  const parsedChrome = parseUserAgent(chromeUA);
  check('UA parse Chrome on Windows', parsedChrome.browser === 'Chrome 122' && parsedChrome.os === 'Windows 10/11');

  const macSafariUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15';
  const parsedSafari = parseUserAgent(macSafariUA);
  check('UA parse Safari on macOS', parsedSafari.browser === 'Safari 17' && parsedSafari.os === 'macOS 14.3.1');

  const firefoxLinuxUA = 'Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0';
  const parsedFirefox = parseUserAgent(firefoxLinuxUA);
  check('UA parse Firefox on Linux', parsedFirefox.browser === 'Firefox 123' && parsedFirefox.os === 'Linux');

  // --- 2. URL Sanitization ---
  check('Clean URL strips query parameters', cleanUrl('https://example.com/api/auth?token=supersecret&user=123') === 'https://example.com/api/auth');
  check('Clean URL strips hash fragments', cleanUrl('https://example.com/checkout#payment-step') === 'https://example.com/checkout');
  check('Clean URL strips both query and hash', cleanUrl('https://example.com/path?key=val#hash') === 'https://example.com/path');
  check('Clean URL handles null/empty safely', cleanUrl(null) === '' && cleanUrl('') === '');
  check('Clean URL unwraps proxied URLs and preserves real upstream path', cleanUrl('http://localhost:5000/api/proxy?url=https%3A%2F%2Fapi.example.com%2Fv1%2Fcheckout%3Fsecret%3D123&projectId=abc') === 'https://api.example.com/v1/checkout');

  // --- 3. Context Sanitization and Privacy Clamping ---
  const oversizedErrors = Array.from({ length: 30 }, (_, i) => ({
    level: 'error',
    message: `Error number ${i}: ` + 'x'.repeat(600),
    at: new Date(),
  }));
  const oversizedRequests = Array.from({ length: 25 }, (_, i) => ({
    method: 'post',
    url: `https://example.com/api/item/${i}?token=secret${i}#frag`,
    status: 500,
  }));

  const rawContext = {
    browser: 'Chrome 122',
    os: 'Windows 11',
    screen: { w: '1920', h: '1080', dpr: '1.25' },
    pageTitle: 'Very Long Page Title '.repeat(20),
    elementText: 'Very Long Element Text '.repeat(10),
    consoleErrors: oversizedErrors,
    failedRequests: oversizedRequests,
    timeZone: 'America/New_York',
    language: 'en-US',
  };

  const sanitized = sanitizePinContext(rawContext, { projectSettings: { captureConsoleErrors: true, guestConsoleCapture: false }, isGuest: false });
  check('Console errors ring buffer capped at 20', sanitized.consoleErrors.length === 20);
  check('Console error messages truncated to 500 chars', sanitized.consoleErrors[0].message.length <= 500);
  check('Failed requests ring buffer capped at 20', sanitized.failedRequests.length === 20);
  check('Failed request URLs sanitized', !sanitized.failedRequests[0].url.includes('?token') && !sanitized.failedRequests[0].url.includes('#frag'));
  check('elementText truncated to 120 chars', sanitized.elementText.length <= 120);
  check('pageTitle truncated to 200 chars', sanitized.pageTitle.length <= 200);
  check('Screen numbers parsed', sanitized.screen.w === 1920 && sanitized.screen.h === 1080 && sanitized.screen.dpr === 1.25);

  const jsonStringContext = JSON.stringify({ browser: 'Firefox 120', os: 'Linux' });
  const parsedJson = sanitizePinContext(jsonStringContext);
  check('Stringified JSON context parsed correctly', parsedJson && parsedJson.browser === 'Firefox 120');

  // Privacy toggles
  const noConsoleSanitized = sanitizePinContext(rawContext, { projectSettings: { captureConsoleErrors: false }, isGuest: false });
  check('captureConsoleErrors: false empties consoleErrors', noConsoleSanitized.consoleErrors.length === 0);

  const guestDefaultSanitized = sanitizePinContext(rawContext, { projectSettings: { captureConsoleErrors: true, guestConsoleCapture: false }, isGuest: true });
  check('Guest reviewer gets 0 console errors by default', guestDefaultSanitized.consoleErrors.length === 0);
  check('Guest reviewer still retains failed network requests', guestDefaultSanitized.failedRequests.length === 20);

  const guestAllowedSanitized = sanitizePinContext(rawContext, { projectSettings: { captureConsoleErrors: true, guestConsoleCapture: true }, isGuest: true });
  check('Guest reviewer gets console errors when guestConsoleCapture is true', guestAllowedSanitized.consoleErrors.length === 20);

  check('Clean URL does not falsely unwrap non-proxy URLs with url query parameter', cleanUrl('https://analytics.example.com/track?url=https%3A%2F%2Fsite.com&v=1') === 'https://analytics.example.com/track');

  // Circular reference object test for console error sanitization
  const circularObj = { message: 'Circular error' };
  circularObj.self = circularObj;
  const circularContext = {
    consoleErrors: [{ level: 'error', message: circularObj }],
  };
  const circularSanitized = sanitizePinContext(circularContext, { projectSettings: { captureConsoleErrors: true } });
  check('Circular error message safely handled without throwing', circularSanitized.consoleErrors.length === 1 && typeof circularSanitized.consoleErrors[0].message === 'string');

  // --- 4. Proxy Script Injection Check ---
  const sampleHtml = '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>';
  const injected = injectScript(sampleHtml, 'https://example.com/test', 'proj123', 'http://localhost:5000', '', false);
  check('Injected script adds __markupDiag in <head>', injected.includes('__markupDiag'));
  check('Injected script adds console & network interceptors', injected.includes('pushError') && injected.includes('pushRequest'));
  check('Injected script captures pageTitle and elementText', injected.includes('elementText') && injected.includes('document.title'));
  check('Injected script protects form control values', injected.includes('target.getAttribute(\'placeholder\')') && !injected.includes('elementText = target.value'));
  check('Injected script unwraps proxied URLs in pushRequest', injected.includes('url.match(/[?&]url=([^&]+)/i)'));
  check('Injected script ignores aborted XHR requests', injected.includes('xhr.__markupAborted'));
  check('Injected script updates __markupPageUrl on pushState', injected.includes('__markupPageUrl = resolved.href'));
  check('Injected script updates __markupPageUrl on popstate and hashchange', injected.includes('popstate') && injected.includes('hashchange'));
  check('Injected script ignores video and audio tags during capture', injected.includes("tag === 'VIDEO' || tag === 'AUDIO'"));

  // --- 5. Database Model Persistence ---
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('\nConnected to MongoDB for model testing');

  const user = await User.create({ name: 'Tester', email: 'tester@phase3.com', passwordHash: 'hash' });
  const org = await Organization.create({ name: 'Phase3 Org', owner: user._id });
  const project = await Project.create({
    name: 'Phase3 Project',
    projectType: 'website',
    websiteUrl: 'https://example.com',
    owner: user._id,
    organization: org._id,
    settings: { captureConsoleErrors: true, guestConsoleCapture: false },
  });

  const pin = await Pin.create({
    project: project._id,
    pageUrl: 'https://example.com',
    createdBy: user._id,
    xPercent: 50,
    yPercent: 50,
    pinNumber: 1,
    context: sanitized,
  });

  const fetchedPin = await Pin.findById(pin._id).lean();
  check('Pin.context persisted in MongoDB', fetchedPin.context && fetchedPin.context.browser === 'Chrome 122');
  check('Pin.context.consoleErrors persisted', fetchedPin.context.consoleErrors.length === 20);
  check('Pin.context.screen persisted', fetchedPin.context.screen.w === 1920 && fetchedPin.context.screen.h === 1080);

  // Test pin with null screen
  const pinNullScreen = await Pin.create({
    project: project._id,
    pageUrl: 'https://example.com/doc',
    createdBy: user._id,
    xPercent: 10,
    yPercent: 10,
    pinNumber: 2,
    context: { browser: 'Safari 17', screen: null },
  });
  const fetchedNullScreen = await Pin.findById(pinNullScreen._id).lean();
  check('Pin.context.screen remains null when null passed', fetchedNullScreen.context.screen === null);

  // Test updating project settings
  project.settings.captureConsoleErrors = false;
  project.settings.guestConsoleCapture = true;
  await project.save();
  const fetchedProj = await Project.findById(project._id).lean();
  check('Project.settings updated in MongoDB', fetchedProj.settings.captureConsoleErrors === false && fetchedProj.settings.guestConsoleCapture === true);

  // Clean up
  await Pin.deleteMany({ project: project._id });
  await Project.deleteOne({ _id: project._id });
  await Organization.deleteOne({ _id: org._id });
  await User.deleteOne({ _id: user._id });
  await mongoose.disconnect();

  console.log(`\nResults: ${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
