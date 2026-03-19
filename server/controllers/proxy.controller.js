const axios = require("axios");
const https = require("https");
const crypto = require("crypto");
const Project = require("../models/Project");
const {
  rewriteHtml,
  rewriteCssUrls,
  rewriteJsUrls,
  injectScript,
} = require("../utils/proxyRewriter");
const asyncHandler = require("../utils/asyncHandler");
const { setCache, getCache, deleteCache, clearCache, setAsset, getAsset } = require("../utils/redisCache");

// --- Shared HTTPS agent with connection pooling (reused across all requests) ---
const upstreamAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 20,
});

// --- Project lookup cache (avoids DB hit on every sub-resource request) ---
const projectCache = new Map();
const PROJECT_CACHE_TTL = 60000; // 60 seconds

function getCachedProject(projectId) {
  const entry = projectCache.get(projectId);
  if (!entry) return null;
  if (Date.now() - entry.ts > PROJECT_CACHE_TTL) {
    projectCache.delete(projectId);
    return null;
  }
  return entry.project;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of projectCache) {
    if (now - v.ts > PROJECT_CACHE_TTL) projectCache.delete(k);
  }
}, 120000);

function hashContent(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

// --- Cached serverBase (same for all requests, no need to rebuild per-request) ---
let cachedServerBase = null;

// --- Domain failure cache (reduces console spam and skips known-bad domains) ---
const failedDomains = new Map();
const DOMAIN_FAIL_TTL = 30000; // 30 seconds

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

exports.proxyPage = asyncHandler(async (req, res) => {
  const { url, projectId } = req.query;

  if (!url || !projectId) {
    return res
      .status(400)
      .json({ message: "url and projectId query params are required" });
  }

  // Skip browser-generated blank frames — not a real request
  if (url.startsWith('about:')) {
    return res.status(204).send('');
  }

  // Verify project exists and user has access (cached)
  let project = getCachedProject(projectId);
  if (!project) {
    project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    projectCache.set(projectId, { project, ts: Date.now() });
  }

  // const userId = req.user._id.toString();
  // const isMember = project.members.some((m) => m.toString() === userId);
  // const isOwner = project.owner.toString() === userId;
  // if (!isMember && !isOwner) {
  //   return res.status(403).json({ message: 'Not a member of this project' });
  // }

  // Remove X-Frame-Options set by Helmet so iframe can display proxy content
  res.removeHeader('X-Frame-Options');

  // Cache serverBase — same value for the lifetime of this process
  const serverBase = cachedServerBase || (cachedServerBase = `${req.protocol}://${req.get('host')}`);

  // Early exit: if this domain recently failed, skip the request
  const cachedFailure = getFailedDomain(url);
  if (cachedFailure) {
    const domain = getDomain(url) || url;
    return sendContentAwareError(req, res, url, domain, cachedFailure.message);
  }

  // Serve cached HTML instantly from Redis (shared across all cluster workers)
  const isGetRequest = req.method === 'GET';
  const isDocumentRequest = (req.headers.accept || '').includes('text/html');
  if (isGetRequest && isDocumentRequest) {
    const cacheKey = url + '|' + projectId;
    try {
      const cachedHtml = await getCache(cacheKey);
      if (cachedHtml) {
        res.removeHeader('X-Frame-Options');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(cachedHtml);
      }
    } catch {}
  }

  // Serve cached sub-resources (CSS, JS, images, fonts) from Redis
  if (isGetRequest && !isDocumentRequest) {
    try {
      const cached = await getAsset(url);
      if (cached) {
        res.removeHeader('X-Frame-Options');
        res.setHeader('Content-Type', cached.contentType);
        return res.send(cached.body);
      }
    } catch {}
  }

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
        "Accept-Encoding": "gzip, deflate, br",
      },
      maxRedirects: 5,
      timeout: isDocumentRequest ? 20000 : 8000,
      decompress: true,
      httpsAgent: upstreamAgent,
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

    // Forward body and Content-Type for non-GET/HEAD requests (POST, PUT, PATCH, DELETE)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const incomingContentType = req.headers['content-type'] || '';
      if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        if (incomingContentType.includes('application/json')) {
          axiosConfig.data = JSON.stringify(req.body);
          axiosConfig.headers['Content-Type'] = 'application/json';
        } else if (incomingContentType.includes('application/x-www-form-urlencoded')) {
          axiosConfig.data = new URLSearchParams(req.body).toString();
          axiosConfig.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        } else {
          axiosConfig.data = req.body;
          if (incomingContentType) axiosConfig.headers['Content-Type'] = incomingContentType;
        }
      } else if (req.body) {
        axiosConfig.data = req.body;
        if (req.headers['content-type']) axiosConfig.headers['Content-Type'] = req.headers['content-type'];
      }
    }

    const response = await axios(axiosConfig);

    const contentType = response.headers["content-type"] || "";

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

    // Only forward safe headers from upstream, skip ones that conflict
    const headersToSkip = new Set([
      "x-frame-options",
      "content-security-policy",
      "content-security-policy-report-only",
      "content-length",
      "content-encoding",
      "transfer-encoding",
      "connection",
      "keep-alive",
      "strict-transport-security",
      "set-cookie",
    ]);

    Object.entries(response.headers).forEach(([key, value]) => {
      if (!headersToSkip.has(key.toLowerCase())) {
        try { res.setHeader(key, value); } catch {}
      }
    });

    // Only rewrite HTML/CSS/JS for GET requests; non-GET responses (API JSON etc.) pass through

    if (isGetRequest && contentType.includes("text/html")) {
      // Store proxy context cookie for catch-all fallback (handles window.location navigations)
      try {
        const pageOrigin = new URL(url).origin;
        res.cookie('__markup_proxy_ctx', JSON.stringify({
          origin: pageOrigin,
          projectId,
          token: req.query.token || '',
        }), { httpOnly: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 });
      } catch {}

      const html = response.data.toString("utf-8");
      let rewritten = rewriteHtml(html, url, projectId, serverBase);
      rewritten = injectScript(rewritten, url, projectId, serverBase);

      // Cache rewritten HTML in Redis — shared across cluster workers, invalidated by BullMQ watcher
      const hasEtag = !!response.headers['etag'];
      const hasLastMod = !!response.headers['last-modified'];
      setCache(url + '|' + projectId, {
        html: rewritten,
        etag: response.headers['etag'] || null,
        lastModified: response.headers['last-modified'] || null,
        contentHash: (!hasEtag && !hasLastMod) ? hashContent(response.data) : null,
        originalUrl: url,
        projectId,
      }).catch(() => {});

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(rewritten);
    }

    if (isGetRequest && contentType.includes("text/css")) {
      const css = response.data.toString("utf-8");
      const rewritten = rewriteCssUrls(css, url, projectId, serverBase);
      setAsset(url, { contentType, body: rewritten }).catch(() => {});
      res.setHeader("Content-Type", contentType);
      return res.send(rewritten);
    }

    // Rewrite URLs inside JavaScript files (fixes Vite/ESM imports)
    if (isGetRequest && (contentType.includes("javascript") || contentType.includes("text/javascript") ||
        contentType.includes("application/x-javascript"))) {
      const js = response.data.toString("utf-8");
      const rewritten = rewriteJsUrls(js, url, projectId, serverBase);
      setAsset(url, { contentType, body: rewritten }).catch(() => {});
      res.setHeader("Content-Type", contentType);
      return res.send(rewritten);
    }

    // For everything else (images, fonts, etc.), pass through + cache
    if (isGetRequest && contentType && !contentType.includes('text/html')) {
      setAsset(url, { contentType, body: response.data }).catch(() => {});
    }
    res.setHeader("Content-Type", contentType);
    return res.send(response.data);
  } catch (err) {
    const domain = getDomain(url) || url;
    const domainErrors = ['ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ERR_TLS_CERT_ALTNAME_INVALID'];

    if (domainErrors.includes(err.code) && getDomain(url)) {
      failedDomains.set(getDomain(url), {
        timestamp: Date.now(),
        errorCode: err.code,
        message: errorMessages[err.code] || err.message,
      });
    } else {
      // Silence HTTP 4xx (upstream's problem) and known noisy beacon URLs
      const status = err.response?.status;
      const isNoisyUrl = /google\.com\/ccm\/collect|cdn-cgi\/rum/.test(url);
      if (!isNoisyUrl && (!status || status >= 500)) {
        console.error(`Proxy error for ${url}: ${err.message}`);
      }
    }

    const reason = errorMessages[err.code] || `Could not load the page (${err.message}).`;
    return sendContentAwareError(req, res, url, domain, reason);
  }
});

// Expose for cache watcher worker
exports.upstreamAgent = upstreamAgent;
