const axios = require("axios");
const https = require("https");
const Project = require("../models/Project");
const {
  rewriteHtml,
  rewriteCssUrls,
  injectScript,
} = require("../utils/proxyRewriter");
const asyncHandler = require("../utils/asyncHandler");

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

  // Verify project exists and user has access
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
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

  // Early exit: if this domain recently failed, skip the request
  const cachedFailure = getFailedDomain(url);
  if (cachedFailure) {
    const domain = getDomain(url) || url;
    return sendContentAwareError(req, res, url, domain, cachedFailure.message);
  }

  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      maxRedirects: 5,
      timeout: 15000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    const contentType = response.headers["content-type"] || "";

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
    ]);

    Object.entries(response.headers).forEach(([key, value]) => {
      if (!headersToSkip.has(key.toLowerCase())) {
        try { res.setHeader(key, value); } catch {}
      }
    });

    if (contentType.includes("text/html")) {
      const html = response.data.toString("utf-8");
      let rewritten = rewriteHtml(html, url, projectId, serverBase);
      rewritten = injectScript(rewritten, url, projectId, serverBase);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(rewritten);
    }

    if (contentType.includes("text/css")) {
      const css = response.data.toString("utf-8");
      const rewritten = rewriteCssUrls(css, url, projectId, serverBase);
      res.setHeader("Content-Type", contentType);
      return res.send(rewritten);
    }

    // For everything else (JS, images, fonts), pass through
    res.setHeader("Content-Type", contentType);
    return res.send(response.data);
  } catch (err) {
    const domain = getDomain(url) || url;
    const domainErrors = ['ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ERR_TLS_CERT_ALTNAME_INVALID'];

    if (domainErrors.includes(err.code) && getDomain(url)) {
      const alreadyCached = failedDomains.has(getDomain(url));
      failedDomains.set(getDomain(url), {
        timestamp: Date.now(),
        errorCode: err.code,
        message: errorMessages[err.code] || err.message,
      });
      // Log only the first failure per domain within the TTL window
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
