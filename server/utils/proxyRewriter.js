const cheerio = require('cheerio');
const { URL } = require('url');

function rewriteUrl(href, baseUrl, projectId, serverBase) {
  if (!href || href.startsWith('data:') || href.startsWith('#') || href.startsWith('javascript:')) {
    return href;
  }
  try {
    const absolute = new URL(href, baseUrl).href;
    return `${serverBase}/api/proxy?url=${encodeURIComponent(absolute)}&projectId=${projectId}`;
  } catch {
    return href;
  }
}

function rewriteCssUrls(css, baseUrl, projectId, serverBase) {
  return css.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g, (match, quote, url) => {
    if (url.startsWith('data:')) return match;
    const rewritten = rewriteUrl(url.trim(), baseUrl, projectId, serverBase);
    return `url(${quote}${rewritten}${quote})`;
  });
}

function rewriteJsUrls(js, pageUrl, projectId, serverBase) {
  let pageOrigin;
  try { pageOrigin = new URL(pageUrl).origin; } catch { return js; }

  const proxyBase = `${serverBase}/api/proxy?`;

  function buildProxy(path) {
    const abs = new URL(path, pageOrigin).href;
    return `${proxyBase}url=${encodeURIComponent(abs)}&projectId=${projectId}`;
  }

  return js
    // Static ES module imports: from "/path..."
    .replace(/(from\s*)(["'])(\/[^"']+)\2/g, (match, prefix, quote, path) => {
      if (path.indexOf('/api/proxy?') !== -1) return match;
      try { return `${prefix}${quote}${buildProxy(path)}${quote}`; }
      catch { return match; }
    })
    // Dynamic imports: import("/path...")
    .replace(/(import\s*\(\s*)(["'])(\/[^"']+)\2(\s*\))/g, (match, prefix, quote, path, suffix) => {
      if (path.indexOf('/api/proxy?') !== -1) return match;
      try { return `${prefix}${quote}${buildProxy(path)}${quote}${suffix}`; }
      catch { return match; }
    })
    // Quoted absolute paths under known asset directories
    .replace(/(["'])(\/(?:assets|static|_next|__next|build|dist|chunks?|js|css|media|fonts)\/.+?)\1/g, (match, quote, path) => {
      if (path.indexOf('/api/proxy?') !== -1) return match;
      try { return `${quote}${buildProxy(path)}${quote}`; }
      catch { return match; }
    });
}

function rewriteHtml(html, pageUrl, projectId, serverBase) {
  const $ = cheerio.load(html, { decodeEntities: false });

  // Rewrite link hrefs (stylesheets, icons)
  $('link[href]').each((_, el) => {
    const href = $(el).attr('href');
    $(el).attr('href', rewriteUrl(href, pageUrl, projectId, serverBase));
  });

  // Rewrite script srcs
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    $(el).attr('src', rewriteUrl(src, pageUrl, projectId, serverBase));
  });

  // Rewrite img srcs and srcsets
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src');
    $(el).attr('src', rewriteUrl(src, pageUrl, projectId, serverBase));
  });
  $('img[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset');
    const rewritten = srcset.split(',').map((entry) => {
      const parts = entry.trim().split(/\s+/);
      parts[0] = rewriteUrl(parts[0], pageUrl, projectId, serverBase);
      return parts.join(' ');
    }).join(', ');
    $(el).attr('srcset', rewritten);
  });

  // Rewrite anchor hrefs
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      $(el).attr('href', rewriteUrl(href, pageUrl, projectId, serverBase));
    }
  });

  // Rewrite source elements (video, picture)
  $('source[src]').each((_, el) => {
    $(el).attr('src', rewriteUrl($(el).attr('src'), pageUrl, projectId, serverBase));
  });
  $('source[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset');
    const rewritten = srcset.split(',').map((entry) => {
      const parts = entry.trim().split(/\s+/);
      parts[0] = rewriteUrl(parts[0], pageUrl, projectId, serverBase);
      return parts.join(' ');
    }).join(', ');
    $(el).attr('srcset', rewritten);
  });

  // Rewrite CSS url() in inline styles
  $('style').each((_, el) => {
    const css = $(el).html();
    if (css) {
      $(el).html(rewriteCssUrls(css, pageUrl, projectId, serverBase));
    }
  });

  // Rewrite inline style attributes
  $('[style]').each((_, el) => {
    const style = $(el).attr('style');
    if (style && style.includes('url(')) {
      $(el).attr('style', rewriteCssUrls(style, pageUrl, projectId, serverBase));
    }
  });

  // Rewrite video poster attributes
  $('video[poster]').each((_, el) => {
    $(el).attr('poster', rewriteUrl($(el).attr('poster'), pageUrl, projectId, serverBase));
  });

  // Rewrite iframe srcs
  $('iframe[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src && !src.startsWith('about:') && !src.startsWith('data:')) {
      $(el).attr('src', rewriteUrl(src, pageUrl, projectId, serverBase));
    }
  });

  // Rewrite object/embed elements
  $('object[data]').each((_, el) => {
    $(el).attr('data', rewriteUrl($(el).attr('data'), pageUrl, projectId, serverBase));
  });
  $('embed[src]').each((_, el) => {
    $(el).attr('src', rewriteUrl($(el).attr('src'), pageUrl, projectId, serverBase));
  });

  // Rewrite form actions
  $('form[action]').each((_, el) => {
    const action = $(el).attr('action');
    if (action && !action.startsWith('javascript:') && !action.startsWith('#')) {
      $(el).attr('action', rewriteUrl(action, pageUrl, projectId, serverBase));
    }
  });

  // Rewrite common lazy-load data attributes
  $('[data-src]').each((_, el) => {
    $(el).attr('data-src', rewriteUrl($(el).attr('data-src'), pageUrl, projectId, serverBase));
  });
  $('[data-lazy-src]').each((_, el) => {
    $(el).attr('data-lazy-src', rewriteUrl($(el).attr('data-lazy-src'), pageUrl, projectId, serverBase));
  });
  $('[data-srcset]').each((_, el) => {
    const srcset = $(el).attr('data-srcset');
    const rewritten = srcset.split(',').map((entry) => {
      const parts = entry.trim().split(/\s+/);
      parts[0] = rewriteUrl(parts[0], pageUrl, projectId, serverBase);
      return parts.join(' ');
    }).join(', ');
    $(el).attr('data-srcset', rewritten);
  });

  // Rewrite legacy background attributes
  $('[background]').each((_, el) => {
    $(el).attr('background', rewriteUrl($(el).attr('background'), pageUrl, projectId, serverBase));
  });

  // Rewrite meta refresh URLs
  $('meta[http-equiv="refresh"]').each((_, el) => {
    const content = $(el).attr('content');
    if (content) {
      const match = content.match(/^(\d+;\s*url=)(.+)$/i);
      if (match) {
        $(el).attr('content', match[1] + rewriteUrl(match[2].trim(), pageUrl, projectId, serverBase));
      }
    }
  });

  // Remove <base> tags — they'd point to the original domain and cause missed URLs
  // to bypass the proxy. The client-side MutationObserver handles dynamic URLs instead.
  $('base').remove();

  return $.html();
}

function injectScript(html, pageUrl, projectId, serverBase) {
  const safePageUrl = pageUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safeServerBase = (serverBase || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  let pageOrigin;
  try { pageOrigin = new URL(pageUrl).origin; } catch { pageOrigin = pageUrl; }
  const safePageOrigin = pageOrigin.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  const injectionScript = `
<script src="${safeServerBase}/vendor/html2canvas.min.js"></script>
<script>
(function() {
  var __markupPageUrl = '${safePageUrl}';
  var __markupServerBase = '${safeServerBase}';
  var __markupProjectId = '${projectId}';
  var __markupPageOrigin = '${safePageOrigin}';
  var __markupToken = '';
  try {
    __markupToken = new URLSearchParams(window.location.search).get('token') || '';
  } catch(e) {}
  var pinMode = false;
  var pins = [];
  var pinContainer = null;
  var prevSelectedId = null;

  // --- Shared URL rewriter (used by interceptors, MutationObserver, etc.) ---
  function toProxy(rawUrl) {
    if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:') ||
        rawUrl.startsWith('#') || rawUrl.startsWith('javascript:') ||
        rawUrl.startsWith('mailto:') || rawUrl.startsWith('tel:')) return rawUrl;
    if (rawUrl.indexOf('/api/proxy?') !== -1) return rawUrl;
    try {
      var abs = new URL(rawUrl, __markupPageOrigin).href;
      return __markupServerBase + '/api/proxy?url=' + encodeURIComponent(abs) + '&projectId=' + __markupProjectId + '&token=' + encodeURIComponent(__markupToken);
    } catch(e) { return rawUrl; }
  }

  function needsProxy(url) {
    if (!url || url.indexOf('/api/proxy?') !== -1) return false;
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
    if (/token|auth|session|jwt|access/i.test(key) && typeof value === 'string' && value.length < 4096) {
      try { document.cookie = '__markup_ls_' + encodeURIComponent(key) + '=' + encodeURIComponent(value) + '; path=/; max-age=86400; samesite=lax'; } catch(e) {}
    }
  };
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var lsKey = localStorage.key(i);
      if (/token|auth|session|jwt|access/i.test(lsKey)) {
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

  function init() {
    // Create pin container
    pinContainer = document.createElement('div');
    pinContainer.id = '__markup_pin_container';
    pinContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999999;';
    document.body.style.position = document.body.style.position || 'relative';
    document.body.appendChild(pinContainer);

    sendMessage('MARKUP_READY', Object.assign(getDimensions(), { pageUrl: __markupPageUrl }));

    // Scroll tracking (throttled)
    var scrollTimeout;
    window.addEventListener('scroll', function() {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(function() {
        sendMessage('MARKUP_SCROLL', getDimensions());
      }, 16);
    }, { passive: true });

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
      try {
        var target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && target.id !== '__markup_pin_container' && !target.classList.contains('__markup_pin')) {
          selector = generateSelector(target);
          var rect = target.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            elementOffsetX = ((e.clientX - rect.left) / rect.width) * 100;
            elementOffsetY = ((e.clientY - rect.top) / rect.height) * 100;
          }
        }
      } catch (err) { /* fallback to percentage */ }

      var viewportXPercent = (e.clientX / window.innerWidth) * 100;
      var viewportYPercent = (e.clientY / window.innerHeight) * 100;

      sendMessage('MARKUP_CLICK', {
        xPercent: xPercent,
        yPercent: yPercent,
        viewportXPercent: viewportXPercent,
        viewportYPercent: viewportYPercent,
        selector: selector,
        elementOffsetX: elementOffsetX,
        elementOffsetY: elementOffsetY,
        pageUrl: __markupPageUrl,
        documentWidth: doc.scrollWidth,
        documentHeight: doc.scrollHeight
      });

      // Capture viewport screenshot asynchronously (don't block pin creation)
      if (typeof html2canvas === 'function') {
        if (pinContainer) pinContainer.style.display = 'none';
        var capture = html2canvas(document.body, {
          x: window.scrollX || window.pageXOffset,
          y: window.scrollY || window.pageYOffset,
          width: window.innerWidth,
          height: window.innerHeight,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          scale: 0.5,
          useCORS: true,
          allowTaint: false,
          logging: false,
          imageTimeout: 3000,
        });
        // Show pins back immediately — html2canvas already read/cloned the DOM
        setTimeout(function() {
          if (pinContainer) pinContainer.style.display = '';
        }, 0);
        var screenshotTimeout = new Promise(function(_, reject) {
          setTimeout(function() { reject(new Error('Screenshot timeout')); }, 8000);
        });
        Promise.race([capture, screenshotTimeout]).then(function(canvas) {
          var dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          sendMessage('MARKUP_SCREENSHOT', { screenshot: dataUrl });
        }).catch(function(err) {
          console.warn('Screenshot capture failed:', err);
          sendMessage('MARKUP_SCREENSHOT', { screenshot: null });
        });
      } else {
        sendMessage('MARKUP_SCREENSHOT', { screenshot: null });
      }
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
      if (!e.data || !e.data.type) return;
      switch (e.data.type) {
        case 'MARKUP_PIN_MODE':
          pinMode = e.data.enabled;
          document.body.style.cursor = pinMode ? 'crosshair' : '';
          break;
        case 'MARKUP_UPDATE_PINS':
          pins = e.data.pins || [];
          renderPins();
          break;
        case 'MARKUP_SELECT_PIN':
          highlightPin(e.data.pinId);
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
      var color = pin.status === 'resolved' ? '#22c55e' : '#ef4444';
      var borderColor = pin.selected ? '#3b82f6' : color;
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

      el.style.left = (pos.left - 14) + 'px';
      el.style.top = (pos.top - 14) + 'px';
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
    var URL_ATTRS = ['src','href','poster','data','action','data-src','data-lazy-src'];

    function rewriteElement(el) {
      for (var i = 0; i < URL_ATTRS.length; i++) {
        var val = el.getAttribute(URL_ATTRS[i]);
        if (val && val.indexOf('/api/proxy?') === -1) {
          var rewritten = toProxy(val);
          if (rewritten !== val) el.setAttribute(URL_ATTRS[i], rewritten);
        }
      }
      var srcset = el.getAttribute('srcset') || el.getAttribute('data-srcset');
      var srcsetAttr = el.hasAttribute('srcset') ? 'srcset' : (el.hasAttribute('data-srcset') ? 'data-srcset' : null);
      if (srcset && srcsetAttr && srcset.indexOf('/api/proxy?') === -1) {
        el.setAttribute(srcsetAttr, srcset.split(',').map(function(entry) {
          var parts = entry.trim().split(/\\s+/);
          parts[0] = toProxy(parts[0]);
          return parts.join(' ');
        }).join(', '));
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
              var children = node.querySelectorAll ? node.querySelectorAll('[src],[href],[poster],[data-src],[data-lazy-src],[srcset],[data-srcset]') : [];
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
      attributes: true, attributeFilter: URL_ATTRS.concat(['srcset','data-srcset','style','class','width','height'])
    });
  } catch(e) {}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>`;

  // Inject before the LAST </body> to avoid inserting inside inline scripts
  // that contain "</body>" in string literals (common in WordPress themes)
  const lastBodyIdx = html.lastIndexOf('</body>');
  if (lastBodyIdx !== -1) {
    return html.slice(0, lastBodyIdx) + injectionScript + html.slice(lastBodyIdx);
  }
  return html + injectionScript;
}

module.exports = { rewriteHtml, rewriteCssUrls, rewriteJsUrls, injectScript };
