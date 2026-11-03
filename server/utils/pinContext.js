/**
 * pinContext.js - Sanitization, parsing and privacy enforcement for Pin.context
 */

// Longest text any pattern below ever sees. Inputs come from browsers (guests
// too), so they are cut before matching and no regex can be made slow.
const MAX_INPUT = 2000;

function extractRealUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.slice(0, MAX_INPUT).trim();
  if (trimmed.includes('/api/proxy')) {
    const match = trimmed.match(/[?&]url=([^&]+)/i);
    if (match && match[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  return trimmed;
}

function cleanUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const realUrl = extractRealUrl(rawUrl.slice(0, MAX_INPUT)).slice(0, MAX_INPUT);
  // Strip query parameters and hash fragments (where auth tokens / secrets often live),
  // credentials in the authority (user:pass@) and ;jsessionid-style path parameters
  return realUrl.split(/[?#]/)[0]
    .replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/@]*@/i, '$1')
    .replace(/;(?:jsessionid|phpsessid|sessionid|sid)=[^/;]*/gi, '');
}

// A key whose value is a credential: one of these words, or a name ending in
// one (accessToken, auth_token, csrftoken, X-Api-Key, client-secret, sessionId).
// The prefix is bounded so the pattern stays linear.
const SECRET_KEY = '[\\w-]{0,40}?(?:token|secret|passw(?:or)?d|pwd|api[_-]?key|apikey|access[_-]?key|private[_-]?key|secret[_-]?key|jwt|signature|session(?:[_-]?id)?|sessid|sid|auth|authorization|credentials?|cookie)';
// A value: a quoted string (escaped quotes allowed) or a bare word
const SECRET_VALUE = `"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|[^\\s,;&}\\]"'\`]+`;
// (skips values an earlier step already replaced)
const KEY_VALUE = new RegExp(`(["']?\\b${SECRET_KEY}\\b["']?\\s*[=:]\\s*)(?!\\[redacted\\])(${SECRET_VALUE})`, 'gi');

/**
 * Console messages and stack traces are free text: remove what can carry
 * credentials (query strings and fragments of URLs, key=value / "key": "value"
 * pairs with sensitive names, auth headers, Bearer/Basic credentials, JWTs and
 * well-known API key formats) before they are stored.
 */
function scrubText(text) {
  if (!text) return '';
  return String(text).slice(0, MAX_INPUT)
    // URLs (also our own /api/proxy?url=…&token=… frames in stack traces): keep scheme,
    // host, path and a stack frame's :line:col
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'`<>()[\]{}]+|\/api\/proxy\?[^\s"'`<>()[\]{}]+/gi, (url) => {
      const trailing = url.match(/[.,;:]+$/)?.[0] || '';
      const bare = url.slice(0, url.length - trailing.length);
      const location = bare.match(/(?::\d+){1,2}$/)?.[0] || '';
      const cleaned = cleanUrl(bare.slice(0, bare.length - location.length));
      return cleaned + (cleaned.endsWith(location) ? '' : location) + trailing;
    })
    // Relative and protocol-relative URLs (/cb?code=…, //cdn.site/a.js?sig=…)
    .replace(/(^|[\s"'(=])((?:\/\/|\.{0,2}\/)[^\s"'()<>?#]*)[?#][^\s"'()<>]*/g, '$1$2')
    // URL-encoded query strings (%3Ftoken%3D…)
    .replace(/%3F[^\s"'()<>]*/gi, '')
    // Whole header values (Authorization: Basic …, Cookie: a=1; b=2)
    .replace(/\b((?:proxy-)?authorization|set-cookie|cookie)(["']?\s*:\s*)("(?:[^"\\]|\\.)*"|[^\r\n]*)/gi, '$1$2[redacted]')
    .replace(/\b(Bearer|Basic|Digest)\s+[A-Za-z0-9\-._~+/]+=*/gi, '$1 [redacted]')
    // JWTs (also without a signature)
    .replace(/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]*)?/g, '[redacted]')
    // Well-known API key formats: Stripe, GitHub, GitLab, AWS, Slack
    .replace(/\b(?:[sprk]k_(?:live|test)_[A-Za-z0-9]{8,}|gh[pousr]_[A-Za-z0-9]{20,}|glpat-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|xox[abprs]-[A-Za-z0-9-]{10,})\b/g, '[redacted]')
    .replace(KEY_VALUE, '$1[redacted]');
}

function parseUserAgent(ua) {
  if (!ua || typeof ua !== 'string') {
    return { browser: 'Unknown', os: 'Unknown' };
  }

  let browser = 'Unknown';
  let os = 'Unknown';

  // Detect OS
  if (/Windows NT 10\.0/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6\.1/i.test(ua)) os = 'Windows 7';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) {
    const match = ua.match(/Mac OS X ([0-9_]+)/i);
    os = match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
  } else if (/Android/i.test(ua)) {
    const match = ua.match(/Android ([0-9.]+)/i);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const match = ua.match(/OS ([0-9_]+)/i);
    os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  // Detect Browser
  if (/Edg\/([0-9]+)/i.test(ua)) {
    const match = ua.match(/Edg\/([0-9]+)/i);
    browser = `Edge ${match ? match[1] : ''}`.trim();
  } else if (/OPR\/([0-9]+)/i.test(ua)) {
    const match = ua.match(/OPR\/([0-9]+)/i);
    browser = `Opera ${match ? match[1] : ''}`.trim();
  } else if (/Chrome\/([0-9]+)/i.test(ua) && !/Chromium/i.test(ua)) {
    const match = ua.match(/Chrome\/([0-9]+)/i);
    browser = `Chrome ${match ? match[1] : ''}`.trim();
  } else if (/Firefox\/([0-9]+)/i.test(ua)) {
    const match = ua.match(/Firefox\/([0-9]+)/i);
    browser = `Firefox ${match ? match[1] : ''}`.trim();
  } else if (/Version\/([0-9]+).*Safari/i.test(ua)) {
    const match = ua.match(/Version\/([0-9]+)/i);
    browser = `Safari ${match ? match[1] : ''}`.trim();
  }

  return { browser, os };
}

function sanitizePinContext(rawContext, options = {}) {
  if (!rawContext) return null;

  let ctx = rawContext;
  if (typeof ctx === 'string') {
    try {
      ctx = JSON.parse(ctx);
    } catch {
      return null;
    }
  }

  if (typeof ctx !== 'object' || ctx === null) return null;

  const { projectSettings = {}, isGuest = false, userAgent = '' } = options;

  // Environment names only need plain characters; dropping the rest keeps markup
  // (<!channel>, <url|text>, *bold*) out of Slack, Teams and Discord messages
  const plain = (v, max) => {
    if (typeof v !== 'string') return null;
    const cleaned = v.replace(/[^\w .()/,+:-]/g, '').trim().slice(0, max);
    return cleaned || null;
  };
  let browser = plain(ctx.browser, 100);
  let os = plain(ctx.os, 100);

  if ((!browser || !os) && userAgent) {
    const parsed = parseUserAgent(userAgent);
    if (!browser) browser = parsed.browser;
    if (!os) os = parsed.os;
  }

  let screen = null;
  if (ctx.screen && typeof ctx.screen === 'object') {
    const w = Number(ctx.screen.w);
    const h = Number(ctx.screen.h);
    const dpr = Number(ctx.screen.dpr);
    if (Number.isFinite(w) && Number.isFinite(h)) {
      screen = {
        w: Math.max(0, Math.min(10000, Math.round(w))),
        h: Math.max(0, Math.min(10000, Math.round(h))),
        dpr: Number.isFinite(dpr) ? Math.max(0.1, Math.min(10, Math.round(dpr * 100) / 100)) : 1,
      };
    }
  }

  const pageTitle = typeof ctx.pageTitle === 'string' ? ctx.pageTitle.trim().slice(0, 200) : null;
  const elementText = typeof ctx.elementText === 'string' ? ctx.elementText.trim().slice(0, 120) : null;
  const timeZone = plain(ctx.timeZone, 100);
  const language = plain(ctx.language, 30);

  // Process console errors
  let consoleErrors = [];
  const captureConsole = projectSettings.captureConsoleErrors !== false;
  const allowGuestCapture = !!projectSettings.guestConsoleCapture;

  if (captureConsole && (!isGuest || allowGuestCapture) && Array.isArray(ctx.consoleErrors)) {
    consoleErrors = ctx.consoleErrors
      .filter((err) => err && typeof err === 'object')
      .slice(-20) // max 20
      .map((err) => {
        const level = err.level === 'warn' ? 'warn' : 'error';
        let rawMsg = '';
        if (typeof err.message === 'string') {
          rawMsg = err.message;
        } else {
          try {
            rawMsg = JSON.stringify(err.message || '');
          } catch {
            rawMsg = String(err.message || '');
          }
        }
        // Scrub before truncating so a cut can't leave half a token behind
        const message = scrubText(rawMsg.slice(0, 2000)).slice(0, 500);
        let at = err.at ? new Date(err.at) : new Date();
        if (isNaN(at.getTime())) at = new Date();
        return { level, message, at };
      });
  }

  // Process failed requests
  let failedRequests = [];
  if (Array.isArray(ctx.failedRequests)) {
    failedRequests = ctx.failedRequests
      .filter((req) => req && typeof req === 'object')
      .slice(-20) // max 20
      .map((req) => {
        const rawMethod = typeof req.method === 'string' ? req.method.toUpperCase() : '';
        const method = /^[A-Z]{1,10}$/.test(rawMethod) ? rawMethod : 'GET';
        const url = cleanUrl(req.url).slice(0, 2000);
        const statusNum = Math.trunc(Number(req.status));
        const status = statusNum >= 0 && statusNum <= 999 ? statusNum : 0;
        return { method, url, status };
      });
  }

  return {
    browser,
    os,
    screen,
    pageTitle,
    elementText,
    consoleErrors,
    failedRequests,
    timeZone,
    language,
  };
}

module.exports = {
  extractRealUrl,
  cleanUrl,
  scrubText,
  parseUserAgent,
  sanitizePinContext,
};

