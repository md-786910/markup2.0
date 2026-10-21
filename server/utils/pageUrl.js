// Canonical form of a reviewed page's URL, so pins stay on "the same page"
// however it was opened: tracking parameters, in-page anchors (#section) and a
// trailing slash are ignored. Hash routes (#/path, #!/path) are kept because
// single-page apps use them for different pages. Non-URL values (document
// pages like "doc:file.pdf:page:2") are returned unchanged.
const TRACKING_PARAMS = /^(utm_[a-z_]+|gclid|fbclid|msclkid|dclid|mc_cid|mc_eid|_ga|_gl|igshid|yclid)$/i;

function normalizePageUrl(raw) {
  if (typeof raw !== 'string' || !/^https?:\/\//i.test(raw)) return raw;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  if (!/^#!?\//.test(url.hash)) url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  }
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }
  return url.toString();
}

// Query value matching pins saved under either the canonical URL or the exact
// URL they were created with before normalization existed.
function pageUrlFilter(raw) {
  const canonical = normalizePageUrl(raw);
  return canonical === raw ? raw : { $in: [canonical, raw] };
}

module.exports = { normalizePageUrl, pageUrlFilter };
