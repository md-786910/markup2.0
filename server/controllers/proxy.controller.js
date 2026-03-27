const axios = require("axios");
const dns = require("dns");
const https = require("https");

// Force IPv4-first DNS resolution (Node.js v22 defaults to IPv6 which causes timeouts with NAT64)
dns.setDefaultResultOrder('ipv4first');
const HttpsProxyAgent = require("https-proxy-agent");
const Project = require("../models/Project");
const {
  rewriteHtml,
  rewriteCssUrls,
  rewriteJsUrls,
  injectScript,
} = require("../utils/proxyRewriter");
const asyncHandler = require("../utils/asyncHandler");

// --- Outbound proxy for blocked connections ---
const OUTBOUND_PROXY = process.env.OUTBOUND_PROXY;
const proxyAgent = OUTBOUND_PROXY ? new HttpsProxyAgent(OUTBOUND_PROXY) : null;
if (proxyAgent) console.log(`Outbound proxy configured: ${OUTBOUND_PROXY}`);

// --- Cloudflare Worker relay (fast fallback for blocked domains) ---
const FALLBACK_RELAY_URL = process.env.FALLBACK_RELAY_URL;
if (FALLBACK_RELAY_URL) console.log(`Fallback relay configured: ${FALLBACK_RELAY_URL}`);

// --- Domain failure cache (reduces console spam and skips known-bad domains) ---
const failedDomains = new Map();
const DOMAIN_FAIL_TTL = 30000; // 30 seconds

// --- Fallback domain cache (skip direct attempt for domains that need fallback) ---
const fallbackDomains = new Map();
const FALLBACK_DOMAIN_TTL = 300000; // 5 minutes

// --- Blocked domain cache (WAF / CDN blocked sites) ---
const blockedDomains = new Map();
const BLOCKED_DOMAIN_TTL = 300000; // 5 minutes

function getBlockedDomain(urlString) {
  const domain = getDomain(urlString);
  if (!domain) return null;
  const ts = blockedDomains.get(domain);
  if (!ts) return null;
  if (Date.now() - ts > BLOCKED_DOMAIN_TTL) {
    blockedDomains.delete(domain);
    return null;
  }
  return true;
}

// --- Project existence cache (avoids DB lookup on every sub-resource) ---
const projectCache = new Map();
const PROJECT_CACHE_TTL = 60000; // 60 seconds

function getCachedProject(projectId) {
  const entry = projectCache.get(projectId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > PROJECT_CACHE_TTL) {
    projectCache.delete(projectId);
    return null;
  }
  return entry.project;
}

// --- Rewrite cache for CSS/JS (avoids re-fetching + re-rewriting identical resources) ---
const rewriteCache = new Map();
const REWRITE_CACHE_TTL = 300000; // 5 minutes
const REWRITE_CACHE_MAX = 500;

const errorMessages = {
  ENOTFOUND: 'Domain not found — the website address may be incorrect or the site no longer exists.',
  ETIMEDOUT: 'Connection timed out — the website took too long to respond.',
  ECONNREFUSED: 'Connection refused — the website is not accepting connections.',
  ECONNRESET: 'Connection was reset — the website closed the connection unexpectedly.',
  ERR_TLS_CERT_ALTNAME_INVALID: 'SSL certificate error — the website has an invalid certificate.',
};

function getDomain(urlString) {
  try { return new URL(urlString).hostname; } catch { return null; }
}

function getFailedDomain(urlString) {
  const domain = getDomain(urlString);
  if (!domain) return null;
  const entry = failedDomains.get(domain);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > DOMAIN_FAIL_TTL) {
    failedDomains.delete(domain);
    return null;
  }
  return entry;
}

function isFallbackDomain(urlString) {
  const domain = getDomain(urlString);
  if (!domain) return false;
  const ts = fallbackDomains.get(domain);
  if (!ts) return false;
  if (Date.now() - ts > FALLBACK_DOMAIN_TTL) {
    fallbackDomains.delete(domain);
    return false;
  }
  return true;
}

// 1x1 transparent PNG
const TRANSPARENT_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

// --- WAF / CDN block detection ---
const WAF_MARKERS = [
  'access denied', 'attention required', 'just a moment',
  'checking your browser', 'cf-error', 'cf-error-details',
  'akamai', 'reference #', "you don't have permission",
  'automated access', 'web server is returning an unknown error',
];

function isBlockedResponse(status, contentType, body) {
  if (![403, 451, 503].includes(status)) return false;
  if (!contentType || !contentType.toLowerCase().includes('text/html')) return false;
  const snippet = (Buffer.isBuffer(body)
    ? body.toString('utf-8', 0, Math.min(body.length, 4096))
    : String(body).slice(0, 4096)
  ).toLowerCase();
  return WAF_MARKERS.some((m) => snippet.includes(m));
}

function sendContentAwareError(req, res, url, domain, reason) {
  const lowerUrl = url.toLowerCase();
  const accept = (req.headers.accept || '').toLowerCase();

  // Remove X-Frame-Options so error pages render in iframe
  res.removeHeader('X-Frame-Options');

  // Image requests → transparent pixel
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|bmp|avif)(\?|$)/.test(lowerUrl) ||
      (accept.includes('image/') && !accept.includes('text/html'))) {
    res.setHeader('Content-Type', 'image/png');
    return res.status(502).send(TRANSPARENT_PIXEL);
  }

  // CSS requests → empty stylesheet
  if (/\.css(\?|$)/.test(lowerUrl) || accept.includes('text/css')) {
    res.setHeader('Content-Type', 'text/css');
    return res.status(502).send(`/* proxy error: ${domain} unreachable */`);
  }

  // JS requests → empty script
  if (/\.(js|mjs)(\?|$)/.test(lowerUrl) || accept.includes('application/javascript') || accept.includes('text/javascript')) {
    res.setHeader('Content-Type', 'application/javascript');
    return res.status(502).send(`/* proxy error: ${domain} unreachable */`);
  }

  // Font requests → 404 empty body
  if (/\.(woff2?|ttf|otf|eot)(\?|$)/.test(lowerUrl) || accept.includes('font/')) {
    return res.status(404).send('');
  }

  // Default: styled HTML error page (for document/page requests)
  const errorHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Unable to load site</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex; align-items: center; justify-content: center; min-height: 100vh;
    margin: 0; background: #f9fafb; color: #374151; }
  .card { text-align: center; max-width: 440px; padding: 2rem; }
  h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
  p { color: #6b7280; font-size: 0.95rem; line-height: 1.5; }
  code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; }
</style></head>
<body><div class="card">
  <h1>Unable to load site</h1>
  <p><code>${domain}</code></p>
  <p>${reason}</p>
</div></body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(502).send(errorHtml);
}

function sendBlockedError(req, res, url, domain) {
  res.removeHeader('X-Frame-Options');
  const errorHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Site blocked</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex; align-items: center; justify-content: center; min-height: 100vh;
    margin: 0; background: #f9fafb; color: #374151; }
  .card { text-align: center; max-width: 480px; padding: 2.5rem 2rem; }
  .icon { width: 48px; height: 48px; margin: 0 auto 1rem; border-radius: 50%;
    background: #fef2f2; display: flex; align-items: center; justify-content: center; }
  .icon svg { width: 24px; height: 24px; color: #ef4444; }
  h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
  p { color: #6b7280; font-size: 0.95rem; line-height: 1.6; margin: 0.25rem 0; }
  code { background: #e5e7eb; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; }
  .hint { font-size: 0.85rem; color: #9ca3af; margin-top: 1rem; }
</style></head>
<body><div class="card">
  <div class="icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
  </svg></div>
  <h1>This site can\u2019t be loaded</h1>
  <p><code>${domain}</code></p>
  <p>This website uses firewall protection (Cloudflare, Akamai, etc.) that blocks automated access. The proxy was unable to load it through any available method.</p>
  <p class="hint">Try visiting the site directly in your browser to confirm it\u2019s accessible.</p>
</div></body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(502).send(errorHtml);
}

// Shared response processing: rewrite HTML/CSS/JS and forward headers
async function processResponse(req, res, response, url, projectId, serverBase, workerBase) {
  const contentType = (response.headers["content-type"] || "").toLowerCase();

  // Rewrite upstream Set-Cookie headers so browser stores them for localhost
  const upstreamSetCookies = response.headers['set-cookie'];
  if (upstreamSetCookies) {
    const setCookies = Array.isArray(upstreamSetCookies) ? upstreamSetCookies : [upstreamSetCookies];
    const rewritten = setCookies.map(c =>
      c.replace(/;\s*Domain=[^;]*/gi, '')
       .replace(/;\s*Secure/gi, '')
       .replace(/;\s*SameSite=[^;]*/gi, '')
      + '; SameSite=Lax'
    );
    res.setHeader('Set-Cookie', rewritten);
  }

  const headersToSkip = new Set([
    "x-frame-options", "content-security-policy", "content-security-policy-report-only",
    "content-length", "content-encoding", "transfer-encoding", "connection",
    "keep-alive", "strict-transport-security", "set-cookie",
    "cache-control", "expires", "pragma",
  ]);
  Object.entries(response.headers).forEach(([key, value]) => {
    if (!headersToSkip.has(key.toLowerCase())) {
      try { res.setHeader(key, value); } catch {}
    }
  });

  // --- Cache-Control headers based on content type ---
  if (contentType.includes("text/html")) {
    res.setHeader('Cache-Control', 'no-cache');
  } else if (contentType.includes("text/css") || contentType.includes("javascript")) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  } else if (/image\/|font\/|application\/font|application\/x-font|audio\/|video\//.test(contentType) ||
             /\.(woff2?|ttf|otf|eot|png|jpe?g|gif|webp|svg|ico|avif|bmp|mp4|webm)(\?|$)/i.test(url)) {
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  }

  const isGetRequest = req.method === 'GET';

  if (isGetRequest && contentType.includes("text/html")) {
    try {
      const pageOrigin = new URL(url).origin;
      res.cookie('__markup_proxy_ctx', JSON.stringify({
        origin: pageOrigin, projectId,
        token: req.query.token || '',
      }), { httpOnly: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 });
    } catch {}
    const html = response.data.toString("utf-8");
    let rewritten = rewriteHtml(html, url, projectId, serverBase, workerBase);
    rewritten = injectScript(rewritten, url, projectId, serverBase, workerBase);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(rewritten);
  }

  if (isGetRequest && contentType.includes("text/css")) {
    const cacheKey = `css:${url}:${projectId}:${serverBase}`;
    const cached = rewriteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < REWRITE_CACHE_TTL) {
      res.setHeader("Content-Type", contentType);
      return res.send(cached.value);
    }
    const css = response.data.toString("utf-8");
    const rewritten = rewriteCssUrls(css, url, projectId, serverBase, workerBase);
    if (rewriteCache.size >= REWRITE_CACHE_MAX) {
      const firstKey = rewriteCache.keys().next().value;
      rewriteCache.delete(firstKey);
    }
    rewriteCache.set(cacheKey, { value: rewritten, timestamp: Date.now() });
    res.setHeader("Content-Type", contentType);
    return res.send(rewritten);
  }

  if (isGetRequest && (contentType.includes("javascript") || contentType.includes("text/javascript") ||
      contentType.includes("application/x-javascript"))) {
    const cacheKey = `js:${url}:${projectId}:${serverBase}`;
    const cached = rewriteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < REWRITE_CACHE_TTL) {
      res.setHeader("Content-Type", contentType);
      return res.send(cached.value);
    }
    const js = response.data.toString("utf-8");
    const rewritten = rewriteJsUrls(js, url, projectId, serverBase, workerBase);
    if (rewriteCache.size >= REWRITE_CACHE_MAX) {
      const firstKey = rewriteCache.keys().next().value;
      rewriteCache.delete(firstKey);
    }
    rewriteCache.set(cacheKey, { value: rewritten, timestamp: Date.now() });
    res.setHeader("Content-Type", contentType);
    return res.send(rewritten);
  }

  res.setHeader("Content-Type", contentType);
  return res.send(response.data);
}

// Try secondary fallback proxies for a blocked/failed domain.
// Returns a raw axios response object (caller must call processResponse), or null.
// Skips CF Worker relay since it's already the primary path in proxyPage().
async function tryFallback(url) {
  // Fallback 1: Outbound HTTP proxy (if configured)
  if (proxyAgent) {
    try {
      const proxyResp = await axios({
        method: 'GET', url, responseType: 'arraybuffer', timeout: 30000,
        httpsAgent: proxyAgent, httpAgent: proxyAgent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        validateStatus: () => true,
      });
      if (!isBlockedResponse(proxyResp.status, proxyResp.headers['content-type'], proxyResp.data)) {
        fallbackDomains.set(getDomain(url), Date.now());
        return proxyResp;
      }
      console.log(`Outbound proxy also blocked for ${url} (HTTP ${proxyResp.status})`);
    } catch (proxyErr) {
      console.error(`Outbound proxy failed for ${url}: ${proxyErr.message}`);
    }
  }

  // Fallback 2: allorigins.win (last resort, free but slow/unreliable)
  try {
    const fallbackResp = await axios({
      method: 'GET',
      url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      responseType: 'arraybuffer', timeout: 30000,
      validateStatus: () => true,
    });
    if (!isBlockedResponse(fallbackResp.status, fallbackResp.headers['content-type'], fallbackResp.data)) {
      fallbackDomains.set(getDomain(url), Date.now());
      return fallbackResp;
    }
    console.log(`allorigins also blocked for ${url} (HTTP ${fallbackResp.status})`);
  } catch (fallbackErr) {
    console.error(`allorigins fallback also failed for ${url}: ${fallbackErr.message}`);
  }
  return null;
}

exports.proxyPage = asyncHandler(async (req, res) => {
  const { url, projectId } = req.query;

  if (!url || !projectId) {
    return res
      .status(400)
      .json({ message: "url and projectId query params are required" });
  }

  // Verify project exists (cache-first to avoid DB lookup on every sub-resource)
  let project = getCachedProject(projectId);
  if (!project) {
    project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    projectCache.set(projectId, { project, timestamp: Date.now() });
  }

  // const userId = req.user._id.toString();
  // const isMember = project.members.some((m) => m.toString() === userId);
  // const isOwner = project.owner.toString() === userId;
  // if (!isMember && !isOwner) {
  //   return res.status(403).json({ message: 'Not a member of this project' });
  // }

  // Remove X-Frame-Options set by Helmet so iframe can display proxy content
  res.removeHeader('X-Frame-Options');

  const serverBase = `${req.protocol}://${req.get('host')}`;
  const workerBase = FALLBACK_RELAY_URL || null; // CF Worker for sub-resources (null = all through Express)

  // Early exit: if this domain recently failed completely, skip the request
  const cachedFailure = getFailedDomain(url);
  if (cachedFailure) {
    const domain = getDomain(url) || url;
    return sendContentAwareError(req, res, url, domain, cachedFailure.message);
  }

  // Early exit: if this domain is known to be WAF-blocked, skip the full chain
  if (getBlockedDomain(url)) {
    const domain = getDomain(url) || url;
    return sendBlockedError(req, res, url, domain);
  }

  // Determine if this is a page request (vs sub-resource like CSS/JS/image)
  // WAF block detection only runs for page requests to avoid false positives
  const accept = (req.headers.accept || '').toLowerCase();
  const isPageRequest = accept.includes('text/html') ||
    /\/$/.test(new URL(url, 'http://localhost').pathname) ||
    !/\.\w{1,5}(\?|$)/.test(url);

  // --- Primary path: CF Worker fetch (fast, edge) when available ---
  let workerBlocked = false;
  if (FALLBACK_RELAY_URL && req.method === 'GET') {
    try {
      const workerResp = await axios({
        method: 'GET',
        url: `${FALLBACK_RELAY_URL}/?url=${encodeURIComponent(url)}`,
        responseType: 'arraybuffer',
        timeout: 15000,
        validateStatus: () => true,
      });
      if (isPageRequest && isBlockedResponse(workerResp.status, workerResp.headers['content-type'], workerResp.data)) {
        console.log(`Worker response blocked by WAF for ${url} (HTTP ${workerResp.status}), trying direct...`);
        workerBlocked = true;
        // Fall through to direct connection below
      } else {
        return processResponse(req, res, workerResp, url, projectId, serverBase, workerBase);
      }
    } catch (workerErr) {
      console.log(`Worker-first fetch failed for ${url}: ${workerErr.message}, falling back to direct...`);
      // Fall through to direct connection below
    }
  }

  // --- Direct connection (used when Worker is unavailable, blocked, or for non-GET) ---
  try {
    const axiosConfig = {
      method: req.method,
      url: url,
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      maxRedirects: 5,
      timeout: 10000,
      validateStatus: () => true,
      httpsAgent: new https.Agent({ rejectUnauthorized: false, family: 4 }),
    };

    // Forward cookies from client to upstream (exclude our internal cookies)
    const internalCookies = new Set(['__markup_proxy_ctx', 'markup_token']);
    const upstreamCookies = Object.entries(req.cookies || {})
      .filter(([name]) => !internalCookies.has(name) && !name.startsWith('__markup_'))
      .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
      .join('; ');
    if (upstreamCookies) {
      axiosConfig.headers['Cookie'] = upstreamCookies;
    }

    // Forward Authorization header from proxied app's requests
    if (req.headers['authorization']) {
      axiosConfig.headers['Authorization'] = req.headers['authorization'];
    }

    // Check for mirrored localStorage auth tokens (prefixed __markup_ls_)
    if (!axiosConfig.headers['Authorization']) {
      const lsAuth = Object.entries(req.cookies || {})
        .find(([name]) => name.startsWith('__markup_ls_') && /token|auth|jwt|access/i.test(name));
      if (lsAuth) {
        axiosConfig.headers['Authorization'] = 'Bearer ' + lsAuth[1];
      }
    }

    // Forward raw body for non-GET/HEAD requests (body is a Buffer from express.raw())
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && req.body.length > 0) {
      axiosConfig.data = req.body;
      if (req.headers['content-type']) {
        axiosConfig.headers['Content-Type'] = req.headers['content-type'];
      }
    }

    const response = await axios(axiosConfig);

    // Check if the direct response is also WAF-blocked
    if (isPageRequest && isBlockedResponse(response.status, response.headers['content-type'], response.data)) {
      console.log(`Direct response also blocked by WAF for ${url} (HTTP ${response.status}), trying fallbacks...`);
      const fallbackResp = await tryFallback(url);
      if (fallbackResp) {
        return processResponse(req, res, fallbackResp, url, projectId, serverBase, workerBase);
      }
      // All methods blocked — cache domain and show error
      const domain = getDomain(url) || url;
      blockedDomains.set(domain, Date.now());
      return sendBlockedError(req, res, url, domain);
    }

    return processResponse(req, res, response, url, projectId, serverBase, workerBase);
  } catch (err) {
    console.log(`Direct proxy failed: code=${err.code} msg=${err.message} url=${url}`);

    // If worker was also blocked and direct threw a network error, try remaining fallbacks
    if (workerBlocked) {
      const fallbackResp = await tryFallback(url);
      if (fallbackResp) {
        return processResponse(req, res, fallbackResp, url, projectId, serverBase, workerBase);
      }
      const domain = getDomain(url) || url;
      blockedDomains.set(domain, Date.now());
      return sendBlockedError(req, res, url, domain);
    }

    const domain = getDomain(url) || url;
    const domainErrors = ['ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ERR_TLS_CERT_ALTNAME_INVALID'];

    if (domainErrors.includes(err.code) && getDomain(url)) {
      const alreadyCached = failedDomains.has(getDomain(url));
      failedDomains.set(getDomain(url), {
        timestamp: Date.now(),
        errorCode: err.code,
        message: errorMessages[err.code] || err.message,
      });
      if (!alreadyCached) {
        console.error(`Proxy error for domain ${domain} (${err.code}): ${err.message}`);
      }
    } else {
      console.error(`Proxy error for ${url}: ${err.message}`);
    }

    const reason = errorMessages[err.code] || `Could not load the page (${err.message}).`;
    return sendContentAwareError(req, res, url, domain, reason);
  }
});
