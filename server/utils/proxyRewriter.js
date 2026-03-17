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

  // Add base tag to help resolve any remaining relative URLs
  if ($('base').length === 0) {
    $('head').prepend(`<base href="${pageUrl}">`);
  }

  return $.html();
}

function injectScript(html, pageUrl, projectId) {
  const injectionScript = `
<script>
(function() {
  var __markupPageUrl = '${pageUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}';
  var pinMode = false;
  var pins = [];
  var pinContainer = null;

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

    // Click tracking
    document.addEventListener('click', function(e) {
      if (!pinMode) return;
      e.preventDefault();
      e.stopPropagation();

      var doc = document.documentElement;
      var xAbs = e.clientX + (window.scrollX || window.pageXOffset);
      var yAbs = e.clientY + (window.scrollY || window.pageYOffset);
      var xPercent = (xAbs / doc.scrollWidth) * 100;
      var yPercent = (yAbs / doc.scrollHeight) * 100;

      sendMessage('MARKUP_CLICK', {
        xPercent: xPercent,
        yPercent: yPercent,
        pageUrl: __markupPageUrl,
        documentWidth: doc.scrollWidth,
        documentHeight: doc.scrollHeight
      });
    }, true);

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

  function renderPins() {
    if (!pinContainer) return;
    pinContainer.innerHTML = '';
    var doc = document.documentElement;

    pins.forEach(function(pin, index) {
      var el = document.createElement('div');
      var left = (pin.xPercent / 100) * doc.scrollWidth;
      var top = (pin.yPercent / 100) * doc.scrollHeight;
      var color = pin.status === 'resolved' ? '#22c55e' : '#ef4444';
      var borderColor = pin.selected ? '#3b82f6' : color;
      var scale = pin.selected ? 'scale(1.3)' : 'scale(1)';

      el.className = '__markup_pin';
      el.dataset.pinId = pin.id;
      el.style.cssText = 'position:absolute;pointer-events:auto;cursor:pointer;'
        + 'width:28px;height:28px;border-radius:50%;'
        + 'background:' + color + ';border:3px solid ' + borderColor + ';'
        + 'display:flex;align-items:center;justify-content:center;'
        + 'color:white;font-size:12px;font-weight:bold;font-family:sans-serif;'
        + 'left:' + (left - 14) + 'px;top:' + (top - 14) + 'px;'
        + 'transform:' + scale + ';transition:transform 0.15s;'
        + 'box-shadow:0 2px 6px rgba(0,0,0,0.3);z-index:1000000;';
      el.textContent = index + 1;

      el.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        sendMessage('MARKUP_PIN_CLICK', { pinId: pin.id });
      });

      pinContainer.appendChild(el);
    });

    // Scroll to selected pin (with retry to handle page-load layout shifts)
    scrollToSelected();
  }

  function scrollToSelected() {
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
        setTimeout(tryScroll, 200);
        return;
      }

      var targetTop = (sel.yPercent / 100) * currentHeight;
      window.scrollTo({ top: targetTop - (window.innerHeight / 2), behavior: 'smooth' });
    }

    // Small initial delay to let the page begin rendering
    setTimeout(tryScroll, 100);
  }

  function highlightPin(pinId) {
    pins.forEach(function(p) { p.selected = (p.id === pinId); });
    renderPins();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>`;

  // Inject before </body> or at end
  if (html.includes('</body>')) {
    return html.replace('</body>', injectionScript + '</body>');
  }
  return html + injectionScript;
}

module.exports = { rewriteHtml, rewriteCssUrls, injectScript };
