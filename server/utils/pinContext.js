/**
 * pinContext.js - Sanitization, parsing and privacy enforcement for Pin.context
 */

function extractRealUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
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
  const realUrl = extractRealUrl(rawUrl);
  // Strip query parameters and hash fragments (where auth tokens / secrets often live)
  return realUrl.split(/[?#]/)[0];
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

  let browser = typeof ctx.browser === 'string' && ctx.browser.trim() ? ctx.browser.trim().slice(0, 100) : null;
  let os = typeof ctx.os === 'string' && ctx.os.trim() ? ctx.os.trim().slice(0, 100) : null;

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
  const timeZone = typeof ctx.timeZone === 'string' ? ctx.timeZone.trim().slice(0, 100) : null;
  const language = typeof ctx.language === 'string' ? ctx.language.trim().slice(0, 30) : null;

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
        const message = rawMsg.slice(0, 500);
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
        const method = typeof req.method === 'string' ? req.method.toUpperCase().slice(0, 10) : 'GET';
        const url = cleanUrl(req.url).slice(0, 2000);
        const status = Number(req.status) || 0;
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
  parseUserAgent,
  sanitizePinContext,
};

