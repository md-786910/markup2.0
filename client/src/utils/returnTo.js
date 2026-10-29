// The in-app page a signed-out visitor was sent away from (e.g. an email link
// to /dashboard?support=<id>), so login can take them back there.
const KEY = 'return_to';
// Signing out on purpose isn't "being sent away": nothing is remembered
// until the next sign-in
let signingOut = false;
// Same-site paths only ("//x" and "/\x" would leave the app)
const isAppPath = (path) => typeof path === 'string' && /^\/(?![/\\])/.test(path);

export function signingOutOnPurpose() {
  signingOut = true;
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function rememberReturnTo(path) {
  if (signingOut) return;
  try {
    if (isAppPath(path) && !path.startsWith('/login')) sessionStorage.setItem(KEY, path);
  } catch { /* storage unavailable: login falls back to the dashboard */ }
}

export function takeReturnTo(fallback = '/dashboard') {
  signingOut = false;
  try {
    const path = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (isAppPath(path)) return path;
  } catch { /* ignore */ }
  return fallback;
}
