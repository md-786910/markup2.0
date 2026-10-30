const cheerio = require('cheerio');
const { relayQuery } = require('./relayToken');
const { URL } = require('url');

// `&guest=true` query suffix when the original request is a guest, so the proxyAuth
// middleware permits sub-resource fetches without a JWT. Sub-resources rely on the
// __markup_proxy_ctx cookie too, but the cookie may not be set yet on the very first
// CSS/JS fetch; the explicit query flag avoids that race.
function guestQuery(isGuest) { return isGuest ? '&guest=true' : ''; }

// rewriteUrl: routes through Express (for page navigations that need script injection)
function rewriteUrl(href, baseUrl, projectId, serverBase, isGuest) {
  if (!href || href.startsWith('data:') || href.startsWith('#') || href.startsWith('javascript:')) {
    return href;
  }
  try {
    const absolute = new URL(href, baseUrl).href;
    return `${serverBase}/api/proxy?url=${encodeURIComponent(absolute)}&projectId=${projectId}${guestQuery(isGuest)}`;
  } catch {
    return href;
  }
}

// rewriteAssetUrl: routes through CF Worker (for sub-resources: CSS, JS, images, fonts)
// Falls back to Express if no workerBase is configured.
function rewriteAssetUrl(href, baseUrl, projectId, serverBase, workerBase, isGuest) {
  if (!href || href.startsWith('data:') || href.startsWith('#') || href.startsWith('javascript:')) {
    return href;
  }
  try {
    const absolute = new URL(href, baseUrl).href;
    if (workerBase) {
      return `${workerBase}/?url=${encodeURIComponent(absolute)}${relayQuery()}`;
    }
    return `${serverBase}/api/proxy?url=${encodeURIComponent(absolute)}&projectId=${projectId}${guestQuery(isGuest)}`;
  } catch {
    return href;
  }
}

function rewriteCssUrls(css, baseUrl, projectId, serverBase, workerBase, isGuest) {
  return css
    // @import "file.css" (bare string, without url() wrapper)
    .replace(/@import\s+(['"])([^'"]+)\1/g, (match, quote, importUrl) => {
      if (importUrl.startsWith('data:') || importUrl.includes('?url=') || importUrl.includes('/api/proxy?')) return match;
      const rewritten = rewriteAssetUrl(importUrl.trim(), baseUrl, projectId, serverBase, workerBase, isGuest);
      return `@import url(${quote}${rewritten}${quote})`;
    })
    // url(...) references
    .replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g, (match, quote, url) => {
      if (url.startsWith('data:') || url.includes('?url=') || url.includes('/api/proxy?')) return match;
      const rewritten = rewriteAssetUrl(url.trim(), baseUrl, projectId, serverBase, workerBase, isGuest);
      return `url(${quote}${rewritten}${quote})`;
    });
}

function rewriteJsUrls(js, pageUrl, projectId, serverBase, workerBase, isGuest) {
  let pageOrigin;
  try { pageOrigin = new URL(pageUrl).origin; } catch { return js; }

  function buildProxy(path) {
    const abs = new URL(path, pageOrigin).href;
    if (workerBase) {
      return `${workerBase}/?url=${encodeURIComponent(abs)}${relayQuery()}`;
    }
    return `${serverBase}/api/proxy?url=${encodeURIComponent(abs)}&projectId=${projectId}${guestQuery(isGuest)}`;
  }

  // Resolve relative paths (./file.js, ../dir/file.js) against the JS file's own URL.
  // Always route through Express (not worker) so the module chain continues getting
  // relative imports rewritten — the worker doesn't handle relative imports.
  function buildRelProxy(relPath) {
    const abs = new URL(relPath, pageUrl).href;
    return `${serverBase}/api/proxy?url=${encodeURIComponent(abs)}&projectId=${projectId}${guestQuery(isGuest)}`;
  }

  return js
    // Static ES module imports: from "/path..."
    .replace(/(from\s*)(["'])(\/[^"']+)\2/g, (match, prefix, quote, path) => {
      if (path.indexOf('/api/proxy?') !== -1 || path.indexOf('?url=') !== -1) return match;
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
      if (path.indexOf('/api/proxy?') !== -1 || path.indexOf('?url=') !== -1) return match;
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
      if (path.indexOf('/api/proxy?') !== -1 || path.indexOf('?url=') !== -1) return match;
      try { return `${quote}${buildProxy(path)}${quote}`; }
      catch { return match; }
    });
}

function rewriteHtml(html, pageUrl, projectId, serverBase, workerBase, isGuest) {
  const $ = cheerio.load(html, { decodeEntities: false });
  // asset() routes sub-resources through CF Worker; nav() routes pages through Express
  const asset = (href) => rewriteAssetUrl(href, pageUrl, projectId, serverBase, workerBase, isGuest);
  const nav = (href) => rewriteUrl(href, pageUrl, projectId, serverBase, isGuest);
  const rewriteSrcset = (srcset, rewriter) => srcset.split(',').map((entry) => {
    const parts = entry.trim().split(/\s+/);
    parts[0] = rewriter(parts[0]);
    return parts.join(' ');
  }).join(', ');

  // --- Sub-resources → CF Worker ---
  // Strip integrity + crossorigin from all rewritten elements (proxy modifies content, so hashes won't match)
  $('[integrity]').removeAttr('integrity');
  $('[crossorigin]').removeAttr('crossorigin');
  // Module scripts + modulepreload → Express (so relative imports get rewritten through the chain)
  $('script[type="module"][src]').each((_, el) => { $(el).attr('src', nav($(el).attr('src'))); });
  $('link[rel="modulepreload"][href]').each((_, el) => { $(el).attr('href', nav($(el).attr('href'))); });
  // Non-module scripts → CF Worker
  $('script[src]:not([type="module"])').each((_, el) => { $(el).attr('src', asset($(el).attr('src'))); });
  // Non-modulepreload links (stylesheets, preconnect, etc.) → CF Worker
  $('link[href]:not([rel="modulepreload"])').each((_, el) => { $(el).attr('href', asset($(el).attr('href'))); });
  $('img[src]').each((_, el) => { $(el).attr('src', asset($(el).attr('src'))); });
  $('img[srcset]').each((_, el) => { $(el).attr('srcset', rewriteSrcset($(el).attr('srcset'), asset)); });
  $('source[src]').each((_, el) => { $(el).attr('src', asset($(el).attr('src'))); });
  $('source[srcset]').each((_, el) => { $(el).attr('srcset', rewriteSrcset($(el).attr('srcset'), asset)); });
  $('video[poster]').each((_, el) => { $(el).attr('poster', asset($(el).attr('poster'))); });
  $('iframe[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src && !src.startsWith('about:') && !src.startsWith('data:')) {
      $(el).attr('src', asset(src));
    }
  });
  $('object[data]').each((_, el) => { $(el).attr('data', asset($(el).attr('data'))); });
  $('embed[src]').each((_, el) => { $(el).attr('src', asset($(el).attr('src'))); });
  $('[data-src]').each((_, el) => { $(el).attr('data-src', asset($(el).attr('data-src'))); });
  $('[data-lazy-src]').each((_, el) => { $(el).attr('data-lazy-src', asset($(el).attr('data-lazy-src'))); });
  $('[data-srcset]').each((_, el) => { $(el).attr('data-srcset', rewriteSrcset($(el).attr('data-srcset'), asset)); });
  $('[background]').each((_, el) => { $(el).attr('background', asset($(el).attr('background'))); });

  // Inline CSS url() → CF Worker
  $('style').each((_, el) => {
    const css = $(el).html();
    if (css) $(el).html(rewriteCssUrls(css, pageUrl, projectId, serverBase, workerBase, isGuest));
  });
  $('[style]').each((_, el) => {
    const style = $(el).attr('style');
    if (style && style.includes('url(')) {
      $(el).attr('style', rewriteCssUrls(style, pageUrl, projectId, serverBase, workerBase, isGuest));
    }
  });

  // --- Navigation → Express (needs script injection) ---
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      $(el).attr('href', nav(href));
    }
  });
  $('form[action]').each((_, el) => {
    const action = $(el).attr('action');
    if (action && !action.startsWith('javascript:') && !action.startsWith('#')) {
      $(el).attr('action', nav(action));
    }
  });
  $('meta[http-equiv="refresh"]').each((_, el) => {
    const content = $(el).attr('content');
    if (content) {
      const match = content.match(/^(\d+;\s*url=)(.+)$/i);
      if (match) {
        $(el).attr('content', match[1] + nav(match[2].trim()));
      }
    }
  });

  $('base').remove();
  return $.html();
}

function injectScript(html, pageUrl, projectId, serverBase, workerBase, isGuest) {
  const safePageUrl = pageUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safeServerBase = (serverBase || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safeWorkerBase = (workerBase || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  let pageOrigin;
  try { pageOrigin = new URL(pageUrl).origin; } catch { pageOrigin = pageUrl; }
  const safePageOrigin = pageOrigin.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  const injectionScript = `
<script>
(function() {
  var __markupPageUrl = '${safePageUrl}';
  var __markupServerBase = '${safeServerBase}';
  var __markupWorkerBase = '${safeWorkerBase}';
  var __markupRelayQuery = '${relayQuery()}';
  var __markupProjectId = '${projectId}';
  var __markupPageOrigin = '${safePageOrigin}';
  var __markupIsGuest = ${isGuest ? 'true' : 'false'};
  var __markupToken = '';
  try {
    __markupToken = new URLSearchParams(window.location.search).get('token') || '';
  } catch(e) {}
  var pinMode = false;
  // Each pin-mode click gets an id; its screenshot carries the same id so the
  // app never attaches a late screenshot to a different pin.
  var __markupClickSeq = 0;

  // Screenshot libraries, loaded on demand (the classic one is preloaded when
  // pin mode turns on, so normal page views don't pay for it):
  //   classic: html2canvas 1.4.1, used first
  //   pro:     html2canvas-pro, fallback when classic fails (e.g. oklch colors)
  // Kept on window.__markupH2c, not the html2canvas global the site may own.
  var H2C_URLS = {
    classic: '/api/vendor/html2canvas.min.js?v=1.4.1',
    pro: '/api/vendor/pro/html2canvas-pro.min.js?v=2.5.1'
  };
  window.__markupH2c = window.__markupH2c || {};
  var __h2cLoading = {};
  function loadHtml2canvas(kind) {
    kind = kind || 'classic';
    if (typeof window.__markupH2c[kind] === 'function') return Promise.resolve(window.__markupH2c[kind]);
    if (!__h2cLoading[kind]) {
      __h2cLoading[kind] = new Promise(function(resolve, reject) {
        var previous = window.html2canvas;
        var s = document.createElement('script');
        s.src = __markupServerBase + H2C_URLS[kind];
        // Sites with an AMD loader (RequireJS, Magento) would capture the UMD
        // bundle through define() instead of a global: hide it while loading.
        var amdDefine = window.define;
        var hideAmd = typeof amdDefine === 'function' && amdDefine.amd;
        if (hideAmd) window.define = undefined;
        var restoreAmd = function() { if (hideAmd) window.define = amdDefine; };
        s.onload = function() {
          restoreAmd();
          var fn = window.html2canvas;
          if (previous !== undefined) window.html2canvas = previous;
          if (typeof fn === 'function' && fn !== previous) { window.__markupH2c[kind] = fn; resolve(fn); }
          else { __h2cLoading[kind] = null; reject(new Error('html2canvas unavailable')); }
        };
        s.onerror = function() { restoreAmd(); __h2cLoading[kind] = null; reject(new Error('html2canvas failed to load')); };
        (document.head || document.documentElement).appendChild(s);
      });
    }
    return __h2cLoading[kind];
  }

  // Screenshot of the visible viewport, as the user sees it.
  //  - html2canvas renders a copy of the page in which CSS animations restart;
  //    jump them to their end state so faded-in content isn't captured faded.
  //  - Images outside the viewport or not loaded on the page become blank
  //    placeholders of the same size (no download, no layout shift); fetching
  //    every image on a long page made captures time out.
  //  - Device pixel ratio (max 2) keeps text sharp on HiDPI screens.
  //  - The pin overlay is left out; the app draws the marker itself.
  //  - If the full capture fails or is too slow, a fast one with short image
  //    waits is tried; under the 5 MB upload limit via lower JPEG quality.
  var SCREENSHOT_MAX_CHARS = 6000000; // ~4.4 MB as JPEG
  var BLANK_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  var SKIP_ATTR = 'data-markup-skip';

  // Marks images to blank in the copy (offscreen or not loaded). Images not
  // loaded on the page (lazy, pending) also lose src/srcset on the page until
  // the copy exists: otherwise the copy loads them and the extra height shifts
  // everything below (wrong region). They show nothing on screen either way.
  function markHiddenImages() {
    var marked = [];
    var margin = 200;
    var imgs = document.images;
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var r = img.getBoundingClientRect();
      var offscreen = r.bottom < -margin || r.top > window.innerHeight + margin || r.right < -margin || r.left > window.innerWidth + margin;
      var notLoaded = !img.complete || !img.naturalWidth;
      if (!offscreen && !notLoaded) continue;
      var entry = { img: img, held: false };
      if (notLoaded) {
        entry.held = true;
        entry.src = img.getAttribute('src');
        entry.srcset = img.getAttribute('srcset');
        img.removeAttribute('srcset');
        img.removeAttribute('src');
      }
      img.setAttribute(SKIP_ATTR, Math.round(r.width) + 'x' + Math.round(r.height));
      marked.push(entry);
    }
    return marked;
  }
  function unmark(marked) {
    for (var i = 0; i < marked.length; i++) {
      var e = marked[i];
      e.img.removeAttribute(SKIP_ATTR);
      if (e.held) {
        e.held = false;
        // Don't overwrite a source the site set in the meantime
        if (e.srcset != null && !e.img.hasAttribute('srcset')) e.img.setAttribute('srcset', e.srcset);
        if (e.src != null && !e.img.hasAttribute('src')) e.img.setAttribute('src', e.src);
      }
    }
  }
  function blankSkippedImages(doc) {
    var imgs = doc.querySelectorAll('img[' + SKIP_ATTR + ']');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var size = img.getAttribute(SKIP_ATTR).split('x');
      var pic = img.parentNode && img.parentNode.tagName === 'PICTURE' ? img.parentNode : null;
      if (pic) { var srcs = pic.querySelectorAll('source'); for (var k = 0; k < srcs.length; k++) srcs[k].parentNode.removeChild(srcs[k]); }
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.style.width = size[0] + 'px';
      img.style.height = size[1] + 'px';
      img.src = BLANK_GIF;
    }
  }

  // html2canvas ignores object-fit (images come out stretched) and draws
  // background-clip:text as a filled box. Prepare the page so the copy gets:
  //  - object-fit images pre-rendered at their on-screen size and crop
  //  - gradient text as solid text in the gradient's first color
  var FIT_ATTR = 'data-markup-fit';
  var TEXTCLIP_ATTR = 'data-markup-textclip';
  // html2canvas turns ::before/::after into real child elements in its copy, so
  // :first-child / :last-child / "> * + *" margin rules (WordPress block
  // layouts…) hit different children and shift everything below. Pin the live
  // margins of the first/last child of elements that have such content.
  var MARGIN_ATTR = 'data-markup-margin';
  var MARGIN_PROPS = ['margin-top', 'margin-bottom', 'margin-left', 'margin-right'];
  function hasPseudoContent(el) {
    for (var i = 0; i < 2; i++) {
      var c = getComputedStyle(el, i ? '::after' : '::before').content;
      if (c && c !== 'none' && c !== 'normal') return true;
    }
    return false;
  }
  function objectPosition(value, free, scale) {
    if (/%$/.test(value)) return free * parseFloat(value) / 100;
    if (/px$/.test(value)) return parseFloat(value) * scale;
    if (value === 'left' || value === 'top') return 0;
    if (value === 'right' || value === 'bottom') return free;
    return free / 2;
  }
  function renderFitted(img, cs, r, scale) {
    var nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !nh) return null;
    var w = Math.max(1, Math.round(r.width * scale)), h = Math.max(1, Math.round(r.height * scale));
    var fit = cs.objectFit, f;
    if (fit === 'none') f = scale;
    else if (fit === 'contain') f = Math.min(w / nw, h / nh);
    else if (fit === 'scale-down') f = Math.min(w / nw, h / nh, scale);
    else f = Math.max(w / nw, h / nh); // cover
    var dw = nw * f, dh = nh * f;
    var pos = (cs.objectPosition || '50% 50%').split(' ');
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, objectPosition(pos[0], w - dw, scale), objectPosition(pos[1] || '50%', h - dh, scale), dw, dh);
    return c.toDataURL('image/webp', 0.92); // throws for cross-origin images: left as they are
  }
  function prepareFidelity(scale) {
    var prepared = [];
    var imgs = document.images;
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (img.hasAttribute(SKIP_ATTR)) continue;
      var cs = getComputedStyle(img);
      if (!cs.objectFit || cs.objectFit === 'fill') continue;
      var r = img.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) continue;
      try {
        var url = renderFitted(img, cs, r, scale);
        if (url) { img.setAttribute(FIT_ATTR, String(prepared.length)); prepared.push({ el: img, attr: FIT_ATTR, url: url }); }
      } catch (e) { /* tainted canvas: keep the image as is */ }
    }
    var all = document.body ? document.body.getElementsByTagName('*') : [];
    for (var j = 0; j < all.length; j++) {
      var el = all[j];
      if (el.firstElementChild && hasPseudoContent(el)) {
        var ends = [el.firstElementChild, el.lastElementChild];
        for (var e = 0; e < ends.length; e++) {
          var child = ends[e];
          if (e === 1 && child === ends[0]) continue;
          if (child.hasAttribute(MARGIN_ATTR)) continue;
          var ccs = getComputedStyle(child);
          var margins = {};
          for (var mp = 0; mp < MARGIN_PROPS.length; mp++) margins[MARGIN_PROPS[mp]] = ccs.getPropertyValue(MARGIN_PROPS[mp]);
          child.setAttribute(MARGIN_ATTR, String(prepared.length));
          prepared.push({ el: child, attr: MARGIN_ATTR, margins: margins });
        }
      }
      var st = getComputedStyle(el);
      if ((st.webkitBackgroundClip || st.backgroundClip) !== 'text') continue;
      var m = /rgba?\\([^)]*\\)/.exec(st.backgroundImage || '');
      el.setAttribute(TEXTCLIP_ATTR, String(prepared.length));
      prepared.push({ el: el, attr: TEXTCLIP_ATTR, color: m ? m[0] : st.color });
    }
    return prepared;
  }
  function applyFidelity(doc, prepared) {
    var fitted = doc.querySelectorAll('[' + FIT_ATTR + ']');
    for (var i = 0; i < fitted.length; i++) {
      var p = prepared[+fitted[i].getAttribute(FIT_ATTR)];
      if (!p) continue;
      var img = fitted[i];
      var pic = img.parentNode && img.parentNode.tagName === 'PICTURE' ? img.parentNode : null;
      if (pic) { var srcs = pic.querySelectorAll('source'); for (var k = 0; k < srcs.length; k++) srcs[k].parentNode.removeChild(srcs[k]); }
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.src = p.url;
      img.style.objectFit = 'fill';
    }
    var pinned = doc.querySelectorAll('[' + MARGIN_ATTR + ']');
    for (var m = 0; m < pinned.length; m++) {
      var pm = prepared[+pinned[m].getAttribute(MARGIN_ATTR)];
      if (!pm) continue;
      for (var mk in pm.margins) pinned[m].style.setProperty(mk, pm.margins[mk], 'important');
    }
    var clipped = doc.querySelectorAll('[' + TEXTCLIP_ATTR + ']');
    for (var j = 0; j < clipped.length; j++) {
      var q = prepared[+clipped[j].getAttribute(TEXTCLIP_ATTR)];
      if (!q) continue;
      var st = clipped[j].style;
      st.backgroundImage = 'none';
      st.backgroundColor = 'transparent';
      st.webkitBackgroundClip = 'border-box';
      st.backgroundClip = 'border-box';
      st.color = q.color;
      st.webkitTextFillColor = q.color;
    }
  }
  function unprepare(prepared) {
    for (var i = 0; i < prepared.length; i++) prepared[i].el.removeAttribute(prepared[i].attr);
  }

  // html2canvas scrolls its copy of the page to the current position; with
  // scroll-behavior:smooth that scroll animates and the capture shows the top
  // of the page. Switch it off on the page while the copy is made.
  function disableSmoothScroll() {
    var els = [document.documentElement, document.body].filter(Boolean);
    var saved = els.map(function(el) {
      return { el: el, value: el.style.getPropertyValue('scroll-behavior'), priority: el.style.getPropertyPriority('scroll-behavior') };
    });
    els.forEach(function(el) { el.style.setProperty('scroll-behavior', 'auto', 'important'); });
    return function restore() {
      saved.forEach(function(s) {
        if (s.value) s.el.style.setProperty('scroll-behavior', s.value, s.priority);
        else s.el.style.removeProperty('scroll-behavior');
      });
    };
  }

  // Elements hidden on the page (display:none) are left out of the copy: some
  // render there anyway (widgets hidden by script-set state) and push the
  // content down. Not for <style>/<link>/<script>… or SVG parts (<symbol> etc.
  // are hidden but used elsewhere).
  var KEEP_HIDDEN_TAGS = { STYLE: 1, LINK: 1, SCRIPT: 1, NOSCRIPT: 1, TEMPLATE: 1, META: 1, HEAD: 1, TITLE: 1, BASE: 1 };
  function isHiddenOnPage(el) {
    if (!el || el.nodeType !== 1 || KEEP_HIDDEN_TAGS[el.tagName]) return false;
    if (window.SVGElement && el instanceof SVGElement) return false;
    if (!document.body || !document.body.contains(el) || el === document.body) return false;
    try { return getComputedStyle(el).display === 'none'; } catch (e) { return false; }
  }

  function renderViewport(kind, fast) {
    var scrollX = window.scrollX || window.pageXOffset;
    var scrollY = window.scrollY || window.pageYOffset;
    var marked = markHiddenImages();
    var restoreScroll = disableSmoothScroll();
    // CSS pixels: what the page shows, at a normal file size
    var scale = 1;
    var prepared = [];
    try { prepared = prepareFidelity(scale); } catch (e) { unprepare(prepared); prepared = []; }
    var capture;
    try {
      capture = window.__markupH2c[kind](document.documentElement, {
        x: scrollX,
        y: scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scale: scale,
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: fast ? 500 : 2500,
        ignoreElements: function(el) {
          if (!el) return false;
          var tag = (el.tagName || '').toUpperCase();
          if (tag === 'VIDEO' || tag === 'AUDIO') return true;
          if (el.id === '__markup_pin_container' || (el.classList && el.classList.contains('__markup_pin'))) return true;
          return isHiddenOnPage(el);
        },
        onclone: function(doc) {
          // Before changing the copy's layout: no scroll anchoring (it would
          // move the copy's scroll position when content above shrinks)
          var st = doc.createElement('style');
          st.textContent = 'html,body{scroll-behavior:auto!important;overflow-anchor:none!important}*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}';
          (doc.head || doc.documentElement).appendChild(st);
          unmark(marked);
          unprepare(prepared);
          blankSkippedImages(doc);
          applyFidelity(doc, prepared);
          // html2canvas places everything relative to the page's scroll position
          if (doc.defaultView) doc.defaultView.scrollTo(scrollX, scrollY);
        }
      });
    } catch (err) {
      unmark(marked);
      unprepare(prepared);
      restoreScroll();
      return Promise.reject(err);
    }
    var limit = new Promise(function(_, reject) {
      setTimeout(function() { reject(new Error('Screenshot timeout')); }, fast ? 6000 : 9000);
    });
    return Promise.race([capture, limit]).then(function(canvas) {
      unmark(marked);
      unprepare(prepared);
      restoreScroll();
      return canvas;
    }, function(err) {
      unmark(marked);
      unprepare(prepared);
      restoreScroll();
      throw err;
    });
  }

  function captureViewport() {
    var attempt = function(kind, fast) {
      return loadHtml2canvas(kind).then(function() { return renderViewport(kind, fast); });
    };
    var isTimeout = function(err) { return !!err && /timeout/i.test(err.message || ''); };
    // Too slow (heavy images): retry fast. Can't parse the page (e.g. oklch
    // colors): html2canvas-pro. Each step only runs if the previous one failed.
    return attempt('classic', false).catch(function(err) {
      console.warn('Screenshot: capture failed (' + (err && err.message) + '), retrying');
      if (isTimeout(err)) {
        return attempt('classic', true).catch(function() { return attempt('pro', true); });
      }
      return attempt('pro', false).catch(function(err2) {
        if (!isTimeout(err2)) throw err2;
        return attempt('pro', true);
      });
    }).then(function(canvas) {
      var qualities = [0.85, 0.7, 0.55];
      for (var i = 0; i < qualities.length; i++) {
        var dataUrl = canvas.toDataURL('image/jpeg', qualities[i]);
        if (dataUrl.length <= SCREENSHOT_MAX_CHARS) return dataUrl;
      }
      return null;
    });
  }
  var pins = [];
  var pinContainer = null;
  var prevSelectedId = null;

  function _skipUrl(rawUrl) {
    return !rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:') ||
        rawUrl.startsWith('#') || rawUrl.startsWith('javascript:') ||
        rawUrl.startsWith('mailto:') || rawUrl.startsWith('tel:');
  }

  // --- toProxy: routes through Express (for page nav + XHR/fetch with auth) ---
  function toProxy(rawUrl) {
    if (_skipUrl(rawUrl)) return rawUrl;
    if (rawUrl.indexOf('/api/proxy?') !== -1 || rawUrl.indexOf('?url=') !== -1) return rawUrl;
    try {
      var abs = new URL(rawUrl, __markupPageOrigin).href;
      var url = __markupServerBase + '/api/proxy?url=' + encodeURIComponent(abs) + '&projectId=' + __markupProjectId + '&token=' + encodeURIComponent(__markupToken);
      if (__markupIsGuest) url += '&guest=true';
      return url;
    } catch(e) { return rawUrl; }
  }

  // --- toWorker: routes through CF Worker (for sub-resources: images, CSS, JS, fonts) ---
  function toWorker(rawUrl) {
    if (_skipUrl(rawUrl)) return rawUrl;
    if (rawUrl.indexOf('/api/proxy?') !== -1 || rawUrl.indexOf('?url=') !== -1) return rawUrl;
    if (!__markupWorkerBase) return toProxy(rawUrl);
    try {
      var abs = new URL(rawUrl, __markupPageOrigin).href;
      return __markupWorkerBase + '/?url=' + encodeURIComponent(abs) + __markupRelayQuery;
    } catch(e) { return rawUrl; }
  }

  // --- Rewrite CSS text (url() + @import) for dynamically-inserted <style> elements ---
  function rewriteCssText(cssText) {
    return cssText
      .replace(/@import\\s+(['"])([^'"]+)\\1/g, function(match, quote, importUrl) {
        if (_skipUrl(importUrl)) return match;
        if (importUrl.indexOf('/api/proxy?') !== -1 || importUrl.indexOf('?url=') !== -1) return match;
        return '@import url(' + quote + toWorker(importUrl) + quote + ')';
      })
      .replace(/url\\(\\s*(['"]?)([^)'"]+)\\1\\s*\\)/g, function(match, quote, rawUrl) {
        if (_skipUrl(rawUrl)) return match;
        if (rawUrl.indexOf('/api/proxy?') !== -1 || rawUrl.indexOf('?url=') !== -1) return match;
        return 'url(' + quote + toWorker(rawUrl) + quote + ')';
      });
  }

  function needsProxy(url) {
    if (!url || url.indexOf('/api/proxy?') !== -1 || url.indexOf('?url=') !== -1) return false;
    return true;
  }

  // --- Intercept XMLHttpRequest to route through proxy ---
  var _xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string' && needsProxy(url)) {
      arguments[1] = toProxy(url);
    }
    return _xhrOpen.apply(this, arguments);
  };

  // --- Intercept fetch to route through proxy ---
  var _fetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string' && needsProxy(input)) {
      input = toProxy(input);
    } else if (input && typeof input === 'object' && input.url && needsProxy(input.url)) {
      input = new Request(toProxy(input.url), input);
    }
    return _fetch.call(this, input, init);
  };

  // --- Mirror localStorage auth tokens to cookies for server-side proxy access ---
  // When the proxied app stores JWT tokens in localStorage, we mirror them to cookies
  // so the catch-all redirect and proxy can forward them to the upstream server.
  var _lsSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    _lsSetItem.apply(this, arguments);
    if (/token|auth|session|jwt|access/i.test(key) && !/^markup_/i.test(key) && typeof value === 'string' && value.length < 4096) {
      try { document.cookie = '__markup_ls_' + encodeURIComponent(key) + '=' + encodeURIComponent(value) + '; path=/; max-age=86400; samesite=lax'; } catch(e) {}
    }
  };
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var lsKey = localStorage.key(i);
      if (/token|auth|session|jwt|access/i.test(lsKey) && !/^markup_/i.test(lsKey)) {
        var lsVal = localStorage.getItem(lsKey);
        if (lsVal && lsVal.length < 4096) {
          document.cookie = '__markup_ls_' + encodeURIComponent(lsKey) + '=' + encodeURIComponent(lsVal) + '; path=/; max-age=86400; samesite=lax';
        }
      }
    }
  } catch(e) {}

  // --- Intercept history.pushState / replaceState for SPA navigation ---
  var _pushState = history.pushState;
  var _replaceState = history.replaceState;

  history.pushState = function(state, title, url) {
    if (url) {
      try {
        var resolved = new URL(url, __markupPageOrigin);
        var originalPath = resolved.pathname + resolved.search + resolved.hash;
        __markupPageUrl = resolved.href;
        _pushState.call(this, state, title, originalPath);
        window.parent.postMessage({ type: 'MARKUP_READY', pageUrl: resolved.href, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight }, '*');
        return;
      } catch(e) {}
    }
    return _pushState.apply(this, arguments);
  };

  history.replaceState = function(state, title, url) {
    if (url) {
      try {
        var resolved = new URL(url, __markupPageOrigin);
        var originalPath = resolved.pathname + resolved.search + resolved.hash;
        __markupPageUrl = resolved.href;
        return _replaceState.call(this, state, title, originalPath);
      } catch(e) {}
    }
    return _replaceState.apply(this, arguments);
  };

  // --- Set pathname to match original URL so SPA routers match the correct route ---
  // This runs BEFORE deferred module scripts (Vite/CRA), so React Router sees the
  // original path (e.g. "/company") instead of "/api/proxy".
  try {
    var _origUrl = new URL(__markupPageUrl);
    _replaceState.call(history, null, '', _origUrl.pathname + _origUrl.search + _origUrl.hash);
  } catch(e) {}

  function updatePageUrlFromLocation() {
    try {
      var currentPath = window.location.pathname + window.location.search + window.location.hash;
      var resolved = new URL(currentPath, __markupPageOrigin);
      __markupPageUrl = resolved.href;
      window.parent.postMessage({ type: 'MARKUP_READY', pageUrl: resolved.href, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight }, '*');
    } catch(e) {}
  }
  window.addEventListener('popstate', updatePageUrlFromLocation);
  window.addEventListener('hashchange', updatePageUrlFromLocation);

  function init() {
    // Create pin container
    pinContainer = document.createElement('div');
    pinContainer.id = '__markup_pin_container';
    pinContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999999;overflow:visible;';
    document.body.appendChild(pinContainer);

    sendMessage('MARKUP_READY', Object.assign(getDimensions(), { pageUrl: __markupPageUrl }));

    // Notify parent when page is about to unload (navigation started)
    window.addEventListener('beforeunload', function() {
      sendMessage('MARKUP_NAVIGATING', {});
    });

    // Scroll tracking (throttled)
    var scrollTimeout;
    var _pinScrollRaf = null;
    window.addEventListener('scroll', function() {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(function() {
        sendMessage('MARKUP_SCROLL', getDimensions());
      }, 16);
      // position:fixed pin container needs viewport coords recalculated on every scroll
      if (pins.length > 0) {
        if (_pinScrollRaf) cancelAnimationFrame(_pinScrollRaf);
        _pinScrollRaf = requestAnimationFrame(function() {
          _pinScrollRaf = null;
          renderPins();
        });
      }
    }, { passive: true });

    // Smooth-scroll libraries (Locomotive/Lenis) transform a container instead of
    // scrolling the window, so the native 'scroll' event above never fires. Hook
    // the captured instance's own scroll event to keep pin markers aligned.
    try {
      var _scroller = window.__markupScroller;
      if (_scroller && typeof _scroller.on === 'function') {
        _scroller.on('scroll', function() { scheduleRenderPins(); });
      }
    } catch (e) {}

    window.addEventListener('resize', function() {
      sendMessage('MARKUP_SCROLL', getDimensions());
      renderPins();
    });

    // Re-render pins when images/media finish loading (may shift layout)
    document.addEventListener('load', function(e) {
      var tag = e.target && e.target.tagName;
      if (tag === 'IMG' || tag === 'VIDEO' || tag === 'IFRAME') {
        scheduleRenderPins();
      }
    }, true); // capture phase — load doesn't bubble

    // Re-render pins when CSS transitions/animations complete
    document.addEventListener('transitionend', scheduleRenderPins, true);
    document.addEventListener('animationend', scheduleRenderPins, true);

    // Stabilization: re-render pins at intervals during initial page load
    // to catch late-loading resources that shift layout
    [500, 1500, 3000, 6000].forEach(function(delay) {
      setTimeout(function() {
        if (pins.length > 0) renderPins();
      }, delay);
    });

    // Click tracking
    document.addEventListener('click', function(e) {
      if (!pinMode) return;
      // Don't create new pin when clicking an existing pin marker
      if (e.target.classList && e.target.classList.contains('__markup_pin')) return;
      e.preventDefault();
      e.stopPropagation();

      var doc = document.documentElement;
      var xAbs = e.clientX + (window.scrollX || window.pageXOffset);
      var yAbs = e.clientY + (window.scrollY || window.pageYOffset);
      var xPercent = (xAbs / doc.scrollWidth) * 100;
      var yPercent = (yAbs / doc.scrollHeight) * 100;

      // Element-based anchoring: find the DOM element under click
      var selector = null;
      var elementOffsetX = null;
      var elementOffsetY = null;
      var elementText = null;
      try {
        var target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && target.id !== '__markup_pin_container' && !target.classList.contains('__markup_pin')) {
          selector = generateSelector(target);
          var rect = target.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            elementOffsetX = ((e.clientX - rect.left) / rect.width) * 100;
            elementOffsetY = ((e.clientY - rect.top) / rect.height) * 100;
          }
          var tag = (target.tagName || '').toUpperCase();
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            elementText = (target.getAttribute('placeholder') || target.getAttribute('aria-label') || target.name || tag.toLowerCase()).slice(0, 120);
          } else {
            elementText = (target.innerText || target.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);
          }
        }
      } catch (err) { /* fallback to percentage */ }

      var viewportXPercent = (e.clientX / window.innerWidth) * 100;
      var viewportYPercent = (e.clientY / window.innerHeight) * 100;
      var clickId = (++__markupClickSeq) + '-' + Date.now();

      var diag = window.__markupDiag || { consoleErrors: [], failedRequests: [] };
      var context = {
        pageTitle: (document.title || '').slice(0, 200),
        elementText: elementText,
        consoleErrors: (diag.consoleErrors || []).slice(-20),
        failedRequests: (diag.failedRequests || []).slice(-20)
      };

      sendMessage('MARKUP_CLICK', {
        clickId: clickId,
        xPercent: xPercent,
        yPercent: yPercent,
        viewportXPercent: viewportXPercent,
        viewportYPercent: viewportYPercent,
        selector: selector,
        elementOffsetX: elementOffsetX,
        elementOffsetY: elementOffsetY,
        pageUrl: __markupPageUrl,
        documentWidth: doc.scrollWidth,
        documentHeight: doc.scrollHeight,
        context: context
      });

      // Capture exactly what is on screen, asynchronously (don't block pin creation)
      captureViewport().then(function(dataUrl) {
        sendMessage('MARKUP_SCREENSHOT', { clickId: clickId, screenshot: dataUrl });
      }).catch(function(err) {
        console.warn('Screenshot capture failed:', err);
        sendMessage('MARKUP_SCREENSHOT', { clickId: clickId, screenshot: null });
      });
    }, true);

    // --- Intercept <a> clicks for SPA-style navigation ---
    // Runs in bubbling phase AFTER React Router / framework handlers.
    // If the framework already prevented default, we skip (no double-nav).
    document.addEventListener('click', function(e) {
        if (pinMode) return;
        if (e.defaultPrevented) return;

        var anchor = e.target;
        while (anchor && anchor.tagName !== 'A') anchor = anchor.parentElement;
        if (!anchor) return;

        var href = anchor.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:') ||
            href.startsWith('mailto:') || href.startsWith('tel:')) return;

        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var tgt = anchor.getAttribute('target');
        if (tgt && tgt !== '_self') return;

        var targetUrl;
        if (href.indexOf('/api/proxy?') !== -1) {
            try {
                var params = new URLSearchParams(href.substring(href.indexOf('?')));
                targetUrl = params.get('url');
            } catch(ex) { return; }
        } else {
            try { targetUrl = new URL(href, __markupPageOrigin).href; }
            catch(ex) { return; }
        }

        if (!targetUrl) return;

        try {
            var parsed = new URL(targetUrl);
            if (parsed.origin === __markupPageOrigin) {
                e.preventDefault();
                var newPath = parsed.pathname + parsed.search + parsed.hash;
                history.pushState(null, '', newPath);
                window.dispatchEvent(new PopStateEvent('popstate', { state: null }));

                // Fallback for non-SPA sites (WordPress etc.): if no framework
                // handles the popstate, do a full page navigation through the proxy.
                var _fallbackTimer = setTimeout(function() {
                    _fallbackObs.disconnect();
                    window.location.href = toProxy(targetUrl);
                }, 150);
                var _fallbackObs = new MutationObserver(function() {
                    clearTimeout(_fallbackTimer);
                    _fallbackObs.disconnect();
                });
                _fallbackObs.observe(document.body, { childList: true, subtree: true });
            }
        } catch(ex) {}
    }, false);

    // Listen for messages from parent
    window.addEventListener('message', function(e) {
      // Only the app window that embeds this page may control it
      if (e.source !== window.parent) return;
      if (!e.data || !e.data.type) return;
      switch (e.data.type) {
        case 'MARKUP_PIN_MODE':
          pinMode = e.data.enabled;
          if (pinMode) loadHtml2canvas('classic').catch(function() {});
          var cursorStyleId = '__markup_cursor_style';
          var existing = document.getElementById(cursorStyleId);
          if (pinMode) {
            var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="32" viewBox="0 0 28 32"><path d="M2 3a2 2 0 012-2h20a2 2 0 012 2v16a2 2 0 01-2 2H10l-6 7V21H4a2 2 0 01-2-2V3z" fill="#003dff"/><circle cx="9" cy="11" r="1.5" fill="#fff"/><circle cx="14" cy="11" r="1.5" fill="#fff"/><circle cx="19" cy="11" r="1.5" fill="#fff"/></svg>';
            var cursorUrl = 'url(data:image/svg+xml;base64,' + btoa(svg) + ') 4 28, crosshair';
            if (!existing) {
              existing = document.createElement('style');
              existing.id = cursorStyleId;
              document.head.appendChild(existing);
            }
            existing.textContent = 'html, body, body * { cursor: ' + cursorUrl + ' !important; } .__markup_pin { cursor: pointer !important; }';
          } else {
            if (existing) existing.textContent = '';
          }
          break;
        case 'MARKUP_UPDATE_PINS':
          pins = e.data.pins || [];
          renderPins();
          break;
        case 'MARKUP_SELECT_PIN':
          highlightPin(e.data.pinId);
          break;
        case 'MARKUP_NAVIGATE':
          if (e.data.url) {
            window.location.href = toProxy(e.data.url);
          }
          break;
      }
    });
  }

  function generateSelector(el) {
    var parts = [];
    while (el && el !== document.body && el !== document.documentElement) {
      // Skip our own overlay elements
      if (el.id === '__markup_pin_container' || el.classList.contains('__markup_pin')) {
        el = el.parentElement;
        continue;
      }
      var part = el.tagName.toLowerCase();

      // Prefer stable unique attributes: id, data-testid, data-id
      if (el.id) {
        parts.unshift('#' + CSS.escape(el.id));
        break;
      }
      var testId = el.getAttribute('data-testid') || el.getAttribute('data-id');
      if (testId) {
        parts.unshift(part + '[data-' + (el.getAttribute('data-testid') ? 'testid' : 'id') + '="' + CSS.escape(testId) + '"]');
        break;
      }

      // Use stable class names as disambiguators (skip utility/generated classes)
      var stableClasses = [];
      if (el.classList && el.classList.length > 0) {
        for (var c = 0; c < el.classList.length; c++) {
          var cls = el.classList[c];
          // Skip classes that look generated/dynamic (contain hashes, random strings)
          if (!/^[a-zA-Z][\w-]{2,}$/.test(cls)) continue;
          if (/[-_][a-f0-9]{4,}/i.test(cls)) continue;
          stableClasses.push(cls);
          if (stableClasses.length >= 2) break;
        }
      }
      if (stableClasses.length > 0) {
        part += '.' + stableClasses.map(function(s) { return CSS.escape(s); }).join('.');
      }

      // Compute nth-of-type index for disambiguation
      var parent = el.parentElement;
      if (parent) {
        var siblings = parent.children;
        var index = 1;
        for (var i = 0; i < siblings.length; i++) {
          if (siblings[i] === el) break;
          if (siblings[i].tagName === el.tagName) index++;
        }
        var sameTag = 0;
        for (var j = 0; j < siblings.length; j++) {
          if (siblings[j].tagName === el.tagName) sameTag++;
        }
        if (sameTag > 1) {
          part += ':nth-of-type(' + index + ')';
        }
      }
      parts.unshift(part);
      el = el.parentElement;
    }
    if (!parts.length) return null;
    return parts.join(' > ');
  }

  function getPinPosition(pin) {
    var doc = document.documentElement;
    var scrollX = window.scrollX || window.pageXOffset;
    var scrollY = window.scrollY || window.pageYOffset;

    // Try element-based positioning first
    if (pin.selector) {
      try {
        var anchor = document.querySelector(pin.selector);
        if (anchor) {
          var rect = anchor.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            var ox = pin.elementOffsetX != null ? pin.elementOffsetX : 50;
            var oy = pin.elementOffsetY != null ? pin.elementOffsetY : 50;
            return {
              left: rect.left + scrollX + (ox / 100) * rect.width,
              top: rect.top + scrollY + (oy / 100) * rect.height
            };
          }
        }
      } catch (err) { /* fall through to percentage */ }
    }

    // Fallback: scale from original document dimensions to current
    var origW = pin.documentWidth || doc.scrollWidth;
    var origH = pin.documentHeight || doc.scrollHeight;
    var absX = (pin.xPercent / 100) * origW;
    var absY = (pin.yPercent / 100) * origH;
    return {
      left: absX * (doc.scrollWidth / origW),
      top: absY * (doc.scrollHeight / origH)
    };
  }

  function getDimensions() {
    var doc = document.documentElement;
    return {
      scrollX: window.scrollX || window.pageXOffset,
      scrollY: window.scrollY || window.pageYOffset,
      documentWidth: doc.scrollWidth,
      documentHeight: doc.scrollHeight,
      viewportWidth: doc.clientWidth,
      viewportHeight: doc.clientHeight
    };
  }

  function sendMessage(type, data) {
    window.parent.postMessage(Object.assign({ type: type }, data), '*');
  }

  var _pinElements = {};

  function renderPins() {
    if (!pinContainer) return;
    var seen = {};

    pins.forEach(function(pin, index) {
      seen[pin.id] = true;
      var pos = getPinPosition(pin);
      // Brand blue (open) / green (resolved, emerald-500 as in the app) with a white ring: visible on any site
      var color = pin.status === 'resolved' ? '#10b981' : '#003dff';
      var borderColor = pin.selected ? '#001452' : '#ffffff';
      var scale = pin.selected ? 'scale(1.3)' : 'scale(1)';
      var el = _pinElements[pin.id];

      if (!el) {
        el = document.createElement('div');
        el.className = '__markup_pin';
        el.dataset.pinId = pin.id;
        el.style.cssText = 'position:absolute;pointer-events:auto;cursor:pointer;'
          + 'width:28px;height:28px;border-radius:50%;'
          + 'display:flex;align-items:center;justify-content:center;'
          + 'color:white;font-size:12px;font-weight:bold;font-family:sans-serif;'
          + 'box-shadow:0 2px 6px rgba(0,0,0,0.3);z-index:1000000;'
          + 'transition:transform 0.15s;';
        el.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          sendMessage('MARKUP_PIN_CLICK', { pinId: pin.id });
        });
        pinContainer.appendChild(el);
        _pinElements[pin.id] = el;
      }

      var _sx = window.scrollX || window.pageXOffset;
      var _sy = window.scrollY || window.pageYOffset;
      el.style.left = (pos.left - 14 - _sx) + 'px';
      el.style.top = (pos.top - 14 - _sy) + 'px';
      el.style.background = color;
      el.style.borderWidth = '3px';
      el.style.borderStyle = 'solid';
      el.style.borderColor = borderColor;
      el.style.transform = scale;
      el.textContent = pin.pinNumber || (index + 1);
    });

    // Remove elements for pins no longer in the list
    for (var id in _pinElements) {
      if (!seen[id]) {
        _pinElements[id].remove();
        delete _pinElements[id];
      }
    }

    // Only scroll when the selected pin actually changes
    var sel = pins.find(function(p) { return p.selected; });
    var newSelectedId = sel ? sel.id : null;
    if (newSelectedId && newSelectedId !== prevSelectedId) {
      scrollToSelected();
    }
    prevSelectedId = newSelectedId;
  }

  // Debounced re-render for layout-shift compensation
  var _layoutRenderTimer = null;
  var _isRendering = false;

  function scheduleRenderPins() {
    if (_layoutRenderTimer || _isRendering) return;
    _layoutRenderTimer = setTimeout(function() {
      _layoutRenderTimer = null;
      if (pins.length > 0) {
        _isRendering = true;
        renderPins();
        _isRendering = false;
      }
    }, 200);
  }

  var _scrollTimer = null;

  // Resolve a pin's anchor element from its selector (non-zero rect required).
  function resolveAnchor(pin) {
    if (!pin || !pin.selector) return null;
    try {
      var el = document.querySelector(pin.selector);
      if (el) {
        var rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return el;
      }
    } catch (err) { /* invalid selector */ }
    return null;
  }

  // Scroll via a captured smooth-scroll library instance (Locomotive/Lenis),
  // whose own scrollTo drives the transform-based scrolling these sites use.
  function smoothScrollToEl(anchor) {
    var s = window.__markupScroller;
    if (!s || typeof s.scrollTo !== 'function') return false;
    var offset = -Math.round(window.innerHeight / 2); // center-ish
    try {
      if (s.scroll && s.scroll.instance) {
        s.scrollTo(anchor, offset, 800);              // Locomotive v3 positional
      } else {
        s.scrollTo(anchor, { offset: offset, duration: 0.8 }); // v4 / Lenis options
      }
      // Re-align the pin overlay after the library finishes animating.
      setTimeout(scheduleRenderPins, 850);
      return true;
    } catch (e) {
      try { s.scrollTo(anchor); setTimeout(scheduleRenderPins, 850); return true; }
      catch (e2) { return false; }
    }
  }

  function scrollToSelected() {
    // Cancel any previous scroll polling chain
    if (_scrollTimer) {
      clearTimeout(_scrollTimer);
      _scrollTimer = null;
    }

    var sel = pins.find(function(p) { return p.selected; });
    if (!sel) return;

    var lastHeight = 0;
    var attempts = 0;

    function tryScroll() {
      var doc = document.documentElement;
      var currentHeight = doc.scrollHeight;

      // If height is still changing (images/CSS loading), wait and retry
      if (currentHeight !== lastHeight && attempts < 10) {
        lastHeight = currentHeight;
        attempts++;
        _scrollTimer = setTimeout(tryScroll, 200);
        return;
      }

      _scrollTimer = null;

      // Prefer the anchor element so we scroll whatever container actually holds
      // it: (1) a smooth-scroll library instance (Locomotive/Lenis) where native
      // scroll is a no-op, (2) native scrollIntoView, then (3) window.scrollTo.
      var anchor = resolveAnchor(sel);
      if (anchor) {
        if (smoothScrollToEl(anchor)) return;
        anchor.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        return;
      }

      var pos = getPinPosition(sel);
      window.scrollTo({ top: pos.top - (window.innerHeight / 2), behavior: 'smooth' });
    }

    // Small initial delay to let the page begin rendering
    _scrollTimer = setTimeout(tryScroll, 100);
  }

  function highlightPin(pinId) {
    pins.forEach(function(p) { p.selected = (p.id === pinId); });
    renderPins();
  }

  // --- MutationObserver: rewrite URLs the server-side rewriter missed ---
  try {
    var ASSET_ATTRS = ['src','poster','data-src','data-lazy-src'];
    var NAV_ATTRS = ['action'];

    function rewriteElement(el) {
      // Strip integrity + crossorigin (proxy modifies content, hashes won't match)
      if (el.hasAttribute('integrity')) el.removeAttribute('integrity');
      if (el.hasAttribute('crossorigin')) el.removeAttribute('crossorigin');
      var isNav = (el.tagName === 'A' || el.tagName === 'FORM');
      // href: Worker for non-nav elements (link, base), Express for a/form
      var hrefVal = el.getAttribute('href');
      if (hrefVal && hrefVal.indexOf('/api/proxy?') === -1 && hrefVal.indexOf('?url=') === -1) {
        var rewriter = isNav ? toProxy : toWorker;
        var rewritten = rewriter(hrefVal);
        if (rewritten !== hrefVal) el.setAttribute('href', rewritten);
      }
      // Asset attributes → always Worker
      for (var i = 0; i < ASSET_ATTRS.length; i++) {
        var val = el.getAttribute(ASSET_ATTRS[i]);
        if (val && val.indexOf('/api/proxy?') === -1 && val.indexOf('?url=') === -1) {
          var rw = toWorker(val);
          if (rw !== val) el.setAttribute(ASSET_ATTRS[i], rw);
        }
      }
      // Navigation attributes → always Express
      for (var j = 0; j < NAV_ATTRS.length; j++) {
        var navVal = el.getAttribute(NAV_ATTRS[j]);
        if (navVal && navVal.indexOf('/api/proxy?') === -1) {
          var rwNav = toProxy(navVal);
          if (rwNav !== navVal) el.setAttribute(NAV_ATTRS[j], rwNav);
        }
      }
      var srcset = el.getAttribute('srcset') || el.getAttribute('data-srcset');
      var srcsetAttr = el.hasAttribute('srcset') ? 'srcset' : (el.hasAttribute('data-srcset') ? 'data-srcset' : null);
      if (srcset && srcsetAttr && srcset.indexOf('/api/proxy?') === -1 && srcset.indexOf('?url=') === -1) {
        el.setAttribute(srcsetAttr, srcset.split(',').map(function(entry) {
          var parts = entry.trim().split(/\\s+/);
          parts[0] = toWorker(parts[0]);
          return parts.join(' ');
        }).join(', '));
      }
      // Rewrite url() inside <style> element text content
      if (el.tagName === 'STYLE' && el.textContent) {
        var originalCss = el.textContent;
        var rewrittenCss = rewriteCssText(originalCss);
        if (rewrittenCss !== originalCss) el.textContent = rewrittenCss;
      }
      // Rewrite url() inside inline style attributes
      var inlineStyle = el.getAttribute('style');
      if (inlineStyle && inlineStyle.indexOf('url(') !== -1) {
        var rewrittenStyle = rewriteCssText(inlineStyle);
        if (rewrittenStyle !== inlineStyle) el.setAttribute('style', rewrittenStyle);
      }
    }

    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var node = m.addedNodes[j];
            if (node.nodeType === 1) {
              rewriteElement(node);
              var children = node.querySelectorAll ? node.querySelectorAll('[src],[href],[poster],[data-src],[data-lazy-src],[srcset],[data-srcset],style,[style]') : [];
              for (var k = 0; k < children.length; k++) rewriteElement(children[k]);
            }
          }
        }
        if (m.type === 'attributes') {
          rewriteElement(m.target);
        }
      }

      // Re-render pins after layout-affecting DOM changes
      if (!_isRendering) scheduleRenderPins();
    });

    observer.observe(document.documentElement, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['src','href','poster','data-src','data-lazy-src','action','srcset','data-srcset','style','class','width','height']
    });

    // Walk elements already in the DOM at script load time — catches images/backgrounds
    // set by scripts that ran before this one (e.g. slider JS earlier in </body>).
    var _existing = document.querySelectorAll(
      '[src],[href],[poster],[data-src],[data-lazy-src],[srcset],[data-srcset],style,[style]'
    );
    for (var _i = 0; _i < _existing.length; _i++) rewriteElement(_existing[_i]);
  } catch(e) {}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>`;

  // Early capture script — must run BEFORE the page's own scripts so it can wrap
  // smooth-scroll library constructors (Locomotive Scroll, Lenis) and record the
  // created instance on window.__markupScroller. These libraries fake scrolling
  // via CSS transforms, so window.scrollTo/scrollIntoView are no-ops; we later
  // route scroll-to-pin through the instance's own scrollTo(). Non-destructive:
  // the real constructor still runs and the site's scrolling is untouched.
  const captureScript = `
<script>
(function() {
  // Phase 3: Developer-Ready Reports diagnostic ring buffers (<2 KB)
  try {
    var __diag = window.__markupDiag = {
      consoleErrors: [],
      failedRequests: [],
      lastErrorTime: 0,
      lastErrorMessage: '',
      recentSignatures: {},
      pushError: function(level, msg) {
        try {
          var now = Date.now();
          var str = typeof msg === 'string' ? msg : (msg && msg.message ? (msg.message + (msg.stack ? '\\n' + msg.stack : '')) : String(msg));
          var sig = (level || 'error') + ':' + str.slice(0, 100);
          if (this.recentSignatures[sig] && (now - this.recentSignatures[sig]) < 500) return;
          this.recentSignatures[sig] = now;
          this.lastErrorMessage = str;
          this.lastErrorTime = now;
          this.consoleErrors.push({
            level: level === 'warn' ? 'warn' : 'error',
            message: str.slice(0, 500),
            at: new Date().toISOString()
          });
          if (this.consoleErrors.length > 20) this.consoleErrors.shift();
        } catch(e) {}
      },
      pushRequest: function(method, url, status) {
        try {
          var clean = '';
          if (typeof url === 'string') {
            if (url.indexOf('/api/proxy') !== -1) {
              var match = url.match(/[?&]url=([^&]+)/i);
              if (match && match[1]) {
                try { clean = decodeURIComponent(match[1]); } catch(e) { clean = match[1]; }
              } else {
                clean = url;
              }
            } else {
              clean = url;
            }
            clean = clean.split(/[?#]/)[0];
          }
          this.failedRequests.push({
            method: (method || 'GET').toUpperCase().slice(0, 10),
            url: clean.slice(0, 2000),
            status: Number(status) || 0
          });
          if (this.failedRequests.length > 20) this.failedRequests.shift();
        } catch(e) {}
      }
    };

    function safeStringify(a) {
      if (a === null || a === undefined) return String(a);
      if (typeof a !== 'object') return String(a);
      if (a.stack) return a.message + '\\n' + a.stack;
      try {
        return JSON.stringify(a);
      } catch(e) {
        return a.tagName ? ('<' + a.tagName.toLowerCase() + '>') : String(a);
      }
    }

    var origErr = console.error;
    console.error = function() {
      try {
        var args = Array.prototype.slice.call(arguments);
        __diag.pushError('error', args.map(safeStringify).join(' '));
      } catch(e) {}
      if (origErr) return origErr.apply(console, arguments);
    };

    var origWarn = console.warn;
    console.warn = function() {
      try {
        var args = Array.prototype.slice.call(arguments);
        __diag.pushError('warn', args.map(safeStringify).join(' '));
      } catch(e) {}
      if (origWarn) return origWarn.apply(console, arguments);
    };

    window.addEventListener('error', function(ev) {
      try {
        var msg = ev.error && ev.error.stack ? (ev.error.message + '\\n' + ev.error.stack) : (ev.message || 'Script error');
        __diag.pushError('error', msg);
      } catch(e) {}
    });

    window.addEventListener('unhandledrejection', function(ev) {
      try {
        var reason = ev.reason;
        var msg = reason && reason.stack ? (reason.message + '\\n' + reason.stack) : (reason && reason.message ? reason.message : String(reason || 'Unhandled rejection'));
        __diag.pushError('error', 'Unhandled Promise Rejection: ' + msg);
      } catch(e) {}
    });

    if (window.fetch) {
      var origFetch = window.fetch;
      window.fetch = function(input, init) {
        var method = (init && init.method) || (typeof input === 'object' && input && input.method) || 'GET';
        var url = typeof input === 'string' ? input : (input && input.url ? input.url : (input && input.href ? input.href : (input ? String(input) : '')));
        return origFetch.apply(this, arguments).then(function(res) {
          if (!res.ok) __diag.pushRequest(method, url, res.status);
          return res;
        }).catch(function(err) {
          __diag.pushRequest(method, url, 0);
          throw err;
        });
      };
    }

    if (window.XMLHttpRequest) {
      var origOpen = XMLHttpRequest.prototype.open;
      var origSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(method, url) {
        this.__markupMethod = method;
        this.__markupUrl = url;
        this.__markupAborted = false;
        var xhr = this;
        xhr.addEventListener('abort', function() { xhr.__markupAborted = true; });
        return origOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function() {
        var xhr = this;
        xhr.addEventListener('loadend', function() {
          try {
            if (xhr.__markupAborted) return;
            if (xhr.status >= 400 || xhr.status === 0) {
              __diag.pushRequest(xhr.__markupMethod || 'GET', xhr.__markupUrl || '', xhr.status);
            }
          } catch(e) {}
        });
        return origSend.apply(this, arguments);
      };
    }
  } catch(e) {}

  try {
    function record(inst) { try { if (inst) window.__markupScroller = inst; } catch(e){} }
    function wrap(Real) {
      if (typeof Real !== 'function' || Real.__markupWrapped) return Real;
      function Wrapped() {
        var inst = Reflect.construct(Real, Array.prototype.slice.call(arguments), Wrapped);
        record(inst);
        return inst;
      }
      Wrapped.prototype = Real.prototype;
      Wrapped.__markupWrapped = true;
      for (var k in Real) { try { Wrapped[k] = Real[k]; } catch(e){} }
      return Wrapped;
    }
    ['LocomotiveScroll', 'Lenis'].forEach(function(name) {
      try {
        var current = window[name];
        if (typeof current === 'function') { window[name] = wrap(current); return; }
        Object.defineProperty(window, name, {
          configurable: true,
          get: function() { return this['__markup_' + name]; },
          set: function(v) { this['__markup_' + name] = wrap(v); }
        });
      } catch(e){}
    });
  } catch(e){}
})();
</script>`;

  // Insert the capture script as early as possible (right after <head>), so it
  // precedes the page's smooth-scroll library + init scripts.
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch) {
    const idx = headMatch.index + headMatch[0].length;
    html = html.slice(0, idx) + captureScript + html.slice(idx);
  } else {
    html = captureScript + html;
  }

  // Inject the main script before the LAST </body> to avoid inserting inside inline
  // scripts that contain "</body>" in string literals (common in WordPress themes)
  const lastBodyIdx = html.lastIndexOf('</body>');
  if (lastBodyIdx !== -1) {
    return html.slice(0, lastBodyIdx) + injectionScript + html.slice(lastBodyIdx);
  }
  return html + injectionScript;
}

module.exports = { rewriteHtml, rewriteCssUrls, rewriteJsUrls, injectScript };
