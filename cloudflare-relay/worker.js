/**
 * Cloudflare Worker — Asset Proxy with URL Rewriting
 *
 * Primary proxy for sub-resources (CSS, JS, images, fonts).
 * HTML pages are handled by the Express server (needs script injection).
 *
 * Features:
 * - CSS url() rewriting (routes nested resources back through Worker)
 * - JS asset path rewriting (known directories: assets/, static/, _next/, etc.)
 * - Strips X-Frame-Options, CSP, HSTS headers
 * - Cache-Control headers per content type
 * - Cloudflare edge caching via Cache API
 *
 * Deploy: npx wrangler deploy
 * Usage:  https://your-worker.workers.dev/?url=https://example.com/style.css
 *
 * Free tier: 100,000 requests/day
 */

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const requestUrl = new URL(request.url);
    const targetUrl = requestUrl.searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing ?url= parameter', { status: 400, headers: corsHeaders });
    }

    // --- Edge cache: check if we already have this response cached ---
    const cache = caches.default;
    const cacheKey = new Request(request.url, { method: 'GET' });
    let cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }

    // Worker base URL for self-referential rewriting
    const workerBase = `${requestUrl.origin}`;

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
        redirect: 'follow',
      });

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const headers = new Headers(response.headers);

      // --- Strip security headers that block iframe rendering ---
      headers.delete('x-frame-options');
      headers.delete('content-security-policy');
      headers.delete('content-security-policy-report-only');
      headers.delete('strict-transport-security');
      headers.delete('content-encoding');
      headers.delete('transfer-encoding');
      headers.delete('content-length');

      // --- CORS ---
      headers.set('Access-Control-Allow-Origin', '*');

      // --- Cache-Control based on content type ---
      if (contentType.includes('text/css') || contentType.includes('javascript')) {
        headers.set('Cache-Control', 'public, max-age=3600');
      } else if (/image\/|font\/|application\/font|application\/x-font|audio\/|video\//.test(contentType)) {
        headers.set('Cache-Control', 'public, max-age=86400, immutable');
      } else {
        headers.set('Cache-Control', 'public, max-age=600');
      }

      let body;

      // --- CSS: rewrite url() + @import to route nested resources through Worker ---
      const isCssUrl = /\.css(\?|$)/i.test(targetUrl);
      if (contentType.includes('text/css') || (isCssUrl && !contentType.includes('javascript') && !contentType.includes('text/html'))) {
        let css = await response.text();
        css = rewriteCssUrls(css, targetUrl, workerBase);
        body = css;
        headers.set('Content-Type', 'text/css; charset=utf-8');
      }
      // --- JS: rewrite asset paths to route through Worker ---
      else if (contentType.includes('javascript') || contentType.includes('text/javascript') ||
               contentType.includes('application/x-javascript')) {
        let js = await response.text();
        js = rewriteJsUrls(js, targetUrl, workerBase);
        body = js;
        headers.set('Content-Type', contentType);
      }
      // --- Binary (images, fonts, etc.): pass through ---
      else {
        body = response.body;
      }

      const result = new Response(body, {
        status: response.status,
        headers,
      });

      // --- Store in edge cache (non-blocking) — skip error responses (WAF blocks, etc.) ---
      if (response.status >= 200 && response.status < 400) {
        ctx.waitUntil(cache.put(cacheKey, result.clone()));
      }

      return result;
    } catch (err) {
      return new Response(`Relay error: ${err.message}`, { status: 502, headers: corsHeaders });
    }
  },
};

// --- CSS @import + url() rewriting ---
function rewriteCssUrls(css, baseUrl, workerBase) {
  return css
    // @import "file.css" (bare string, without url() wrapper)
    .replace(/@import\s+(['"])([^'"]+)\1/g, (match, quote, importUrl) => {
      if (importUrl.startsWith('data:') || importUrl.startsWith('blob:') || importUrl.startsWith('#')) return match;
      if (importUrl.indexOf('?url=') !== -1) return match;
      try {
        const absolute = new URL(importUrl.trim(), baseUrl).href;
        const proxied = `${workerBase}/?url=${encodeURIComponent(absolute)}`;
        return `@import url(${quote}${proxied}${quote})`;
      } catch {
        return match;
      }
    })
    // url(...) references (also catches @import url("...") from above pass)
    .replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g, (match, quote, rawUrl) => {
      if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:') || rawUrl.startsWith('#')) return match;
      if (rawUrl.indexOf('?url=') !== -1) return match;
      try {
        const absolute = new URL(rawUrl.trim(), baseUrl).href;
        const proxied = `${workerBase}/?url=${encodeURIComponent(absolute)}`;
        return `url(${quote}${proxied}${quote})`;
      } catch {
        return match;
      }
    });
}

// --- JS asset path rewriting ---
function rewriteJsUrls(js, pageUrl, workerBase) {
  let pageOrigin;
  try { pageOrigin = new URL(pageUrl).origin; } catch { return js; }

  function buildProxy(path) {
    const abs = new URL(path, pageOrigin).href;
    return `${workerBase}/?url=${encodeURIComponent(abs)}`;
  }

  // Resolve relative paths (./file.js) against the JS file's own URL
  function buildRelProxy(relPath) {
    const abs = new URL(relPath, pageUrl).href;
    return `${workerBase}/?url=${encodeURIComponent(abs)}`;
  }

  return js
    // Static ES module imports: from "/path..."
    .replace(/(from\s*)(["'])(\/[^"']+)\2/g, (match, prefix, quote, path) => {
      if (path.indexOf('?url=') !== -1) return match;
      try { return `${prefix}${quote}${buildProxy(path)}${quote}`; }
      catch { return match; }
    })
    // Relative ES module imports: from "./file.js" (Vite/Rollup bundles)
    .replace(/(from\s*)(["'])(\.\.?\/[^"']+\.m?js)\2/g, (match, prefix, quote, relPath) => {
      if (relPath.indexOf('?url=') !== -1) return match;
      try { return `${prefix}${quote}${buildRelProxy(relPath)}${quote}`; }
      catch { return match; }
    })
    // Dynamic imports: import("/path...")
    .replace(/(import\s*\(\s*)(["'])(\/[^"']+)\2(\s*\))/g, (match, prefix, quote, path, suffix) => {
      if (path.indexOf('?url=') !== -1) return match;
      try { return `${prefix}${quote}${buildProxy(path)}${quote}${suffix}`; }
      catch { return match; }
    })
    // Dynamic relative imports: import("./file.js")
    .replace(/(import\s*\(\s*)(["'])(\.\.?\/[^"']+\.m?js)\2(\s*\))/g, (match, prefix, quote, relPath, suffix) => {
      if (relPath.indexOf('?url=') !== -1) return match;
      try { return `${prefix}${quote}${buildRelProxy(relPath)}${quote}${suffix}`; }
      catch { return match; }
    })
    // Quoted absolute paths under known asset directories
    .replace(/(["'])(\/(?:assets|static|_next|__next|build|dist|chunks?|js|css|media|fonts)\/.+?)\1/g, (match, quote, path) => {
      if (path.indexOf('?url=') !== -1) return match;
      try { return `${quote}${buildProxy(path)}${quote}`; }
      catch { return match; }
    });
}
