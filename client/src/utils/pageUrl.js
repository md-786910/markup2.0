// Mirrors server/utils/pageUrl.js: the canonical page URL pins are stored
// under. Tracking parameters, in-page anchors and a trailing slash are ignored;
// hash routes (#/path) are kept. Non-URL values are returned unchanged.
const TRACKING_PARAMS = /^(utm_[a-z_]+|gclid|fbclid|msclkid|dclid|mc_cid|mc_eid|_ga|_gl|igshid|yclid)$/i;

export function normalizePageUrl(raw) {
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
