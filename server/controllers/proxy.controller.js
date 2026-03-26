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

// Try fallback proxies for a blocked domain. Returns response or null.
async function tryFallback(req, res, url, projectId, serverBase, workerBase) {
  // Fallback 1: Cloudflare Worker relay (fastest, user-controlled)
  if (FALLBACK_RELAY_URL) {
    try {
      const relayResp = await axios({
        method: 'GET',
        url: `${FALLBACK_RELAY_URL}/?url=${encodeURIComponent(url)}`,
        responseType: 'arraybuffer', timeout: 30000,
        validateStatus: () => true,
      });
      fallbackDomains.set(getDomain(url), Date.now());
      return processResponse(req, res, relayResp, url, projectId, serverBase, workerBase);
    } catch (relayErr) {
      console.error(`Relay failed for ${url}: ${relayErr.message}`);
    }
  }

  // Fallback 2: Outbound HTTP proxy (if configured)
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
      fallbackDomains.set(getDomain(url), Date.now());
      return processResponse(req, res, proxyResp, url, projectId, serverBase, workerBase);
    } catch (proxyErr) {
      console.error(`Outbound proxy failed for ${url}: ${proxyErr.message}`);
    }
  }

  // Fallback 3: allorigins.win (last resort, free but slow/unreliable)
  try {
    const fallbackResp = await axios({
      method: 'GET',
      url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      responseType: 'arraybuffer', timeout: 30000,
    });
    fallbackDomains.set(getDomain(url), Date.now());
    return processResponse(req, res, fallbackResp, url, projectId, serverBase, workerBase);
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

  // --- Primary path: CF Worker fetch (fast, edge) when available ---
  if (FALLBACK_RELAY_URL && req.method === 'GET') {
    try {
      const workerResp = await axios({
        method: 'GET',
        url: `${FALLBACK_RELAY_URL}/?url=${encodeURIComponent(url)}`,
        responseType: 'arraybuffer',
        timeout: 15000, // 15s — generous but way faster than direct+fallback chain (27s+)
        validateStatus: () => true,
      });
      return processResponse(req, res, workerResp, url, projectId, serverBase, workerBase);
    } catch (workerErr) {
      console.log(`Worker-first fetch failed for ${url}: ${workerErr.message}, falling back to direct...`);
      // Fall through to direct connection below
    }
  }

  // --- Fallback: direct connection (used when Worker is unavailable or for non-GET) ---
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
    return processResponse(req, res, response, url, projectId, serverBase, workerBase);
  } catch (err) {
    console.log(`Direct proxy failed: code=${err.code} msg=${err.message} url=${url}`);

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
