const axios = require("axios");
const https = require("https");
const Project = require("../models/Project");
const {
  rewriteHtml,
  rewriteCssUrls,
  injectScript,
} = require("../utils/proxyRewriter");
const asyncHandler = require("../utils/asyncHandler");

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
      rewritten = injectScript(rewritten, url, projectId);
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
    console.error(`Proxy error for ${url}:`, err.message);

    const errorMessages = {
      ENOTFOUND: 'Domain not found — the website address may be incorrect or the site no longer exists.',
      ETIMEDOUT: 'Connection timed out — the website took too long to respond.',
      ECONNREFUSED: 'Connection refused — the website is not accepting connections.',
      ECONNRESET: 'Connection was reset — the website closed the connection unexpectedly.',
      ERR_TLS_CERT_ALTNAME_INVALID: 'SSL certificate error — the website has an invalid certificate.',
    };

    let domain;
    try { domain = new URL(url).hostname; } catch { domain = url; }
    const reason = errorMessages[err.code] || `Could not load the page (${err.message}).`;

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
});
