// Alerts the team when the API answers with many server errors in a short time
// (ERROR_ALERT_THRESHOLD 5xx responses within 5 minutes, default 20), at most
// once every 30 minutes per process. Proxy responses are left out: a 502 there
// means a customer's site was unreachable, not that the API broke.
const WINDOW_MS = 5 * 60 * 1000;
const QUIET_MS = 30 * 60 * 1000;

const recent = [];
let lastAlertAt = 0;

function threshold() {
  const n = parseInt(process.env.ERROR_ALERT_THRESHOLD, 10);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

function recordServerError(req, status) {
  const now = Date.now();
  recent.push({ at: now, path: `${req.method} ${(req.originalUrl || req.url || '').split('?')[0]}`, status });
  while (recent.length && recent[0].at < now - WINDOW_MS) recent.shift();
  if (recent.length < threshold() || now - lastAlertAt < QUIET_MS) return;
  lastAlertAt = now;
  const byPath = {};
  for (const e of recent) byPath[e.path] = (byPath[e.path] || 0) + 1;
  const top = Object.entries(byPath).sort((a, b) => b[1] - a[1]).slice(0, 3);
  require('./adminAlerts').alertErrorSpike({ count: recent.length, minutes: WINDOW_MS / 60000, top }).catch(() => {});
}

// Express middleware: counts this request if it ends in a 5xx
function errorSpikeMonitor(req, res, next) {
  if (!(req.originalUrl || req.url || '').startsWith('/api/proxy')) {
    res.on('finish', () => { if (res.statusCode >= 500) recordServerError(req, res.statusCode); });
  }
  next();
}

// For tests
function resetErrorSpike() { recent.length = 0; lastAlertAt = 0; }

module.exports = { errorSpikeMonitor, recordServerError, resetErrorSpike };
