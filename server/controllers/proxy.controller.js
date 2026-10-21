const axios = require("axios");
const dns = require("dns");
const http = require("http");
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
const { isPublicUrl, safeLookup, beforeRedirect } = require("../utils/ssrfGuard");
const { relayQuery } = require("../utils/relayToken");
const { SECURE_COOKIES } = require("../config/env");

// --- Outbound proxy for blocked connections ---
const OUTBOUND_PROXY = process.env.OUTBOUND_PROXY;
const proxyAgent = OUTBOUND_PROXY ? new HttpsProxyAgent(OUTBOUND_PROXY) : null;
if (proxyAgent) console.log(`Outbound proxy configured: ${OUTBOUND_PROXY}`);

// --- Cloudflare Worker relay (fast fallback for blocked domains) ---
const FALLBACK_RELAY_URL = process.env.FALLBACK_RELAY_URL;
if (FALLBACK_RELAY_URL) console.log(`Fallback relay configured: ${FALLBACK_RELAY_URL}`);

// Map that evicts its oldest entry beyond `max`, so per-domain/per-project caches
// can't grow without bound on a long-running process.
class BoundedMap extends Map {
  constructor(max) {
    super();
    this.max = max;
  }
  set(key, value) {
    if (!this.has(key) && this.size >= this.max) this.delete(this.keys().next().value);
    return super.set(key, value);
  }
}

// Upstream responses larger than this are refused (protects server memory)
const PROXY_MAX_BYTES = parseInt(process.env.PROXY_MAX_BYTES || String(50 * 1024 * 1024), 10);

// --- Domain failure cache (reduces console spam and skips known-bad domains) ---
const failedDomains = new BoundedMap(5000);
const DOMAIN_FAIL_TTL = 30000; // 30 seconds

// --- Fallback domain cache (skip direct attempt for domains that need fallback) ---
const fallbackDomains = new BoundedMap(5000);
const FALLBACK_DOMAIN_TTL = 300000; // 5 minutes

// --- Blocked domain cache (WAF / CDN blocked sites) ---
const blockedDomains = new BoundedMap(5000);
const BLOCKED_DOMAIN_TTL = 300000; // 5 minutes

// --- Relay-bypass domain cache (origins that rate-limit the CF Worker, e.g. Hostinger) ---
// Hostinger's CDN 429s bursts coming from Worker egress IPs but not from our server,
// so for these origins sub-resources are routed through Express instead of the Worker.
const relayBypassDomains = new BoundedMap(5000);
const RELAY_BYPASS_TTL = 3600000; // 1 hour

function isRelayBypassDomain(urlString) {
  const domain = getDomain(urlString);
  if (!domain) return false;
  const ts = relayBypassDomains.get(domain);
  if (!ts) return false;
  if (Date.now() - ts > RELAY_BYPASS_TTL) {
    relayBypassDomains.delete(domain);
    return false;
  }
  return true;
}

function markRelayBypass(urlString, reason) {
  const domain = getDomain(urlString);
  if (!domain || relayBypassDomains.has(domain)) return;
  relayBypassDomains.set(domain, Date.now());
  console.log(`Relay bypass enabled for ${domain} (${reason})`);
}

// --- Relay-first domain cache (origins that block or throttle our server's IP) ---
// Requests go direct first (fastest). When an origin blocks the server, the
// request is retried through the Cloudflare relay and the domain is remembered,
// so its next requests (and the page's assets) use the relay first.
const relayFirstDomains = new BoundedMap(5000);
const RELAY_FIRST_TTL = 3600000; // 1 hour

function needsRelay(urlString) {
  const domain = getDomain(urlString);
  if (!domain) return false;
  const ts = relayFirstDomains.get(domain);
  if (!ts) return false;
  if (Date.now() - ts > RELAY_FIRST_TTL) {
    relayFirstDomains.delete(domain);
    return false;
  }
  return true;
}

function markNeedsRelay(urlString, reason) {
  const domain = getDomain(urlString);
  if (!domain || relayFirstDomains.has(domain)) return;
  relayFirstDomains.set(domain, Date.now());
  console.log(`Relay first for ${domain} (${reason})`);
}

// Upstream answers on assets that mean "this server is being refused", worth a relay retry
const ASSET_RETRY_STATUSES = new Set([403, 429, 503]);
// Network errors the relay can't fix (the site doesn't exist, or we refused it)
const NO_RELAY_ERRORS = new Set(['ENOTFOUND', 'ECONNREFUSED', 'EBLOCKEDADDRESS', 'ERR_FR_REDIRECTION_FAILURE', 'ERR_FR_TOO_MANY_REDIRECTS']);

// Fetch through the Cloudflare relay. ok: usable response; blocked: relay got a bot wall.
async function fetchViaRelay(url, isPageRequest) {
  try {
    const resp = await axios({
      method: 'GET',
      url: `${FALLBACK_RELAY_URL}/?url=${encodeURIComponent(url)}${relayQuery()}`,
      responseType: 'arraybuffer',
      maxContentLength: PROXY_MAX_BYTES,
      timeout: 15000,
      validateStatus: () => true,
    });
    if (resp.status === 429 || resp.status >= 500) {
      // Relay quota exhausted / origin rate-limits the edge IPs / relay error
      if (resp.status === 429) markRelayBypass(url, 'relay got 429');
      return { ok: false, blocked: false };
    }
    if (isPageRequest && isBlockedResponse(resp.status, resp.headers['content-type'], resp.data)) {
      return { ok: false, blocked: true };
    }
    return { ok: true, resp };
  } catch (err) {
    console.log(`Relay fetch failed for ${url}: ${err.message}`);
    return { ok: false, blocked: false };
  }
}

function isRelayThrottlingOrigin(headers = {}) {
  return headers['platform'] === 'hostinger' || !!headers['x-hcdn-request-id'];
}

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
const projectCache = new BoundedMap(2000);
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
// Total size budget for cached CSS/JS, and the largest single file worth caching
const REWRITE_CACHE_MAX_BYTES = parseInt(process.env.PROXY_REWRITE_CACHE_BYTES || String(64 * 1024 * 1024), 10);
const REWRITE_CACHE_ITEM_MAX_BYTES = 4 * 1024 * 1024;
let rewriteCacheBytes = 0;

function rewriteCacheSet(key, value) {
  const size = Buffer.byteLength(value);
  if (size > REWRITE_CACHE_ITEM_MAX_BYTES) return;
  const existing = rewriteCache.get(key);
  if (existing) {
    rewriteCacheBytes -= existing.size;
    rewriteCache.delete(key);
  }
  // Evict oldest entries until both the count and byte budgets fit
  while (rewriteCache.size && (rewriteCache.size >= REWRITE_CACHE_MAX || rewriteCacheBytes + size > REWRITE_CACHE_MAX_BYTES)) {
    const oldestKey = rewriteCache.keys().next().value;
    rewriteCacheBytes -= rewriteCache.get(oldestKey).size;
    rewriteCache.delete(oldestKey);
  }
  rewriteCache.set(key, { value, size, timestamp: Date.now() });
  rewriteCacheBytes += size;
}

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
  // CORS: allow cross-origin access for fonts/assets loaded from Worker-served CSS
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Origins that throttle the Worker: rewrite this response's sub-resources to Express
  if (workerBase && (isRelayBypassDomain(url) || isRelayThrottlingOrigin(response.headers))) {
    markRelayBypass(url, 'origin throttles relay');
    workerBase = null;
  }

  const contentType = (response.headers["content-type"] || "").toLowerCase();

  // Rewrite upstream Set-Cookie headers so browser stores them for localhost
  const upstreamSetCookies = response.headers['set-cookie'];
  if (upstreamSetCookies) {
    const setCookies = (Array.isArray(upstreamSetCookies) ? upstreamSetCookies : [upstreamSetCookies])
      // Never let the proxied site set or overwrite our own cookies (session, CSRF, proxy ctx)
      .filter(c => !/^\s*(markup_|__markup_)/i.test(c));
    const rewritten = setCookies.map(c =>
      c.replace(/;\s*Domain=[^;]*/gi, '')
       .replace(/;\s*Secure/gi, '')
       .replace(/;\s*SameSite=[^;]*/gi, '')
      + '; SameSite=Lax'
    );
    if (rewritten.length) res.setHeader('Set-Cookie', rewritten);
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

  // Guest mode is sticky: query param on the initial iframe load, then cookie
  // on every subsequent sub-resource request. Either source flips this on.
  let isGuest = req.query.guest === 'true';
  if (!isGuest && req.cookies && req.cookies.__markup_proxy_ctx) {
    try {
      const ctx = JSON.parse(req.cookies.__markup_proxy_ctx);
      if (ctx.guest === true) isGuest = true;
    } catch {}
  }

  if (isGetRequest && contentType.includes("text/html")) {
    try {
      const pageOrigin = new URL(url).origin;
      const ctxPayload = { origin: pageOrigin, projectId, token: req.query.token || '' };
      if (isGuest) ctxPayload.guest = true;
      res.cookie('__markup_proxy_ctx', JSON.stringify(ctxPayload), { httpOnly: false, sameSite: 'lax', secure: SECURE_COOKIES, maxAge: 24 * 60 * 60 * 1000 });
    } catch {}
    const html = response.data.toString("utf-8");
    let rewritten = rewriteHtml(html, url, projectId, serverBase, workerBase, isGuest);
    rewritten = injectScript(rewritten, url, projectId, serverBase, workerBase, isGuest);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(rewritten);
  }

  const isCssUrl = /\.css(\?|$)/i.test(url);
  if (isGetRequest && (contentType.includes("text/css") || (isCssUrl && !contentType.includes("javascript") && !contentType.includes("text/html")))) {
    const cacheKey = `css:${url}:${projectId}:${serverBase}:${workerBase || ''}:${isGuest ? 'g' : 'u'}`;
    const cached = rewriteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < REWRITE_CACHE_TTL) {
      res.setHeader("Content-Type", "text/css; charset=utf-8");
      return res.send(cached.value);
    }
    const css = response.data.toString("utf-8");
    const rewritten = rewriteCssUrls(css, url, projectId, serverBase, workerBase, isGuest);
    rewriteCacheSet(cacheKey, rewritten);
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    return res.send(rewritten);
  }

  if (isGetRequest && (contentType.includes("javascript") || contentType.includes("text/javascript") ||
      contentType.includes("application/x-javascript"))) {
    const cacheKey = `js:${url}:${projectId}:${serverBase}:${workerBase || ''}:${isGuest ? 'g' : 'u'}`;
    const cached = rewriteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < REWRITE_CACHE_TTL) {
      res.setHeader("Content-Type", contentType);
      return res.send(cached.value);
    }
    const js = response.data.toString("utf-8");
    const rewritten = rewriteJsUrls(js, url, projectId, serverBase, workerBase, isGuest);
    rewriteCacheSet(cacheKey, rewritten);
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
        maxContentLength: PROXY_MAX_BYTES,
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

  return null;
}

exports.proxyPage = asyncHandler(async (req, res) => {
  // Handle CORS preflight for cross-origin font/asset requests
  if (req.method === 'OPTIONS') {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(204).send('');
  }

  const { url, projectId } = req.query;

  if (!url || !projectId) {
    return res
      .status(400)
      .json({ message: "url and projectId query params are required" });
  }

  // SSRF guard: only public http(s) destinations may be proxied
  if (!(await isPublicUrl(url))) {
    return res.status(403).json({ message: "This address cannot be loaded through the proxy" });
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

  // Unauthenticated (guest) proxy requests: verify the project has an active share link.
  // Keyed on req.user (set by proxyAuth) rather than the query/cookie flag, so a
  // forged guest cookie can't skip this check.
  const isGuestRequest = req.query.guest === 'true' || !req.user;
  if (isGuestRequest) {
    if (!project.shareSettings?.enabled) {
      return res.status(403).json({ message: 'Sharing is not enabled for this project' });
    }
    if (project.shareSettings.expiresAt && new Date(project.shareSettings.expiresAt) < new Date()) {
      return res.status(410).json({ message: 'This review link has expired.' });
    }
  }

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

  // The relay can be used for GETs when configured and the origin doesn't throttle it
  const relayAvailable = !!workerBase && req.method === 'GET' && !isRelayBypassDomain(url);
  let relayTried = false;
  let workerBlocked = false;

  // Origins known to block our server go through the relay first
  if (relayAvailable && needsRelay(url)) {
    const relayed = await fetchViaRelay(url, isPageRequest);
    if (relayed.ok) return processResponse(req, res, relayed.resp, url, projectId, serverBase, workerBase);
    relayTried = true;
    workerBlocked = relayed.blocked;
  }

  // Assets of a page fetched directly are proxied through this server too;
  // pages that needed the relay keep their assets on the relay.
  const assetBase = () => (needsRelay(url) ? workerBase : null);

  // --- Direct connection (primary path) ---
  try {
    const axiosConfig = {
      method: req.method,
      url: url,
      responseType: "arraybuffer",
      maxContentLength: PROXY_MAX_BYTES,
      maxBodyLength: PROXY_MAX_BYTES,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      maxRedirects: 5,
      beforeRedirect,
      timeout: 10000,
      validateStatus: () => true,
      httpAgent: new http.Agent({ family: 4, lookup: safeLookup }),
      httpsAgent: new https.Agent({ rejectUnauthorized: false, family: 4, lookup: safeLookup }),
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

    const pageBlocked = isPageRequest && isBlockedResponse(response.status, response.headers['content-type'], response.data);
    const assetRefused = !isPageRequest && ASSET_RETRY_STATUSES.has(response.status);

    // The origin refuses this server: retry through the relay and remember the domain
    if ((pageBlocked || assetRefused) && relayAvailable && !relayTried) {
      const relayed = await fetchViaRelay(url, isPageRequest);
      relayTried = true;
      if (relayed.ok) {
        markNeedsRelay(url, pageBlocked ? 'direct blocked' : `direct HTTP ${response.status}`);
        return processResponse(req, res, relayed.resp, url, projectId, serverBase, workerBase);
      }
      workerBlocked = relayed.blocked;
    }

    // Check if the direct response is also WAF-blocked
    if (pageBlocked) {
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

    return processResponse(req, res, response, url, projectId, serverBase, assetBase());
  } catch (err) {
    console.log(`Direct proxy failed: code=${err.code} msg=${err.message} url=${url}`);

    // Timeouts / resets can be an IP block: retry through the relay
    if (relayAvailable && !relayTried && !NO_RELAY_ERRORS.has(err.code)) {
      const relayed = await fetchViaRelay(url, isPageRequest);
      relayTried = true;
      if (relayed.ok) {
        markNeedsRelay(url, `direct ${err.code || 'error'}`);
        return processResponse(req, res, relayed.resp, url, projectId, serverBase, workerBase);
      }
      workerBlocked = relayed.blocked;
    }

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
