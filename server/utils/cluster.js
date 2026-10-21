const cluster = require('cluster');
const os = require('os');

// Multi-core mode: the primary process starts N workers that share the port;
// each worker runs the whole server. A crashed worker is replaced while the
// others keep serving. Needs Redis (shared socket.io, rate limits, queues), so
// without REDIS_URL it always runs a single process.
//   WEB_CONCURRENCY=<n>   number of workers (default: CPU cores, max 4)
const DEFAULT_MAX_WORKERS = 4;

function workerCount() {
  if (!process.env.REDIS_URL) {
    if (Number(process.env.WEB_CONCURRENCY) > 1) {
      console.warn('[cluster] WEB_CONCURRENCY ignored: multiple workers need REDIS_URL');
    }
    return 1;
  }
  const requested = parseInt(process.env.WEB_CONCURRENCY, 10);
  if (requested > 0) return requested;
  return Math.min(os.availableParallelism(), DEFAULT_MAX_WORKERS);
}

// Returns true in the primary process (which only supervises workers).
function startClusterIfEnabled() {
  if (!cluster.isPrimary) return false;
  const count = workerCount();
  if (count <= 1) return false;

  // Workers learn they are clustered (socket.io then uses WebSocket only)
  process.env.CLUSTER_WORKERS = String(count);
  console.log(`[cluster] starting ${count} workers`);
  for (let i = 0; i < count; i++) cluster.fork();

  let shuttingDown = false;
  const recentCrashes = [];
  cluster.on('exit', (worker, code, signal) => {
    if (shuttingDown) return;
    console.error(`[cluster] worker ${worker.process.pid} exited (${signal || code}), starting a replacement`);
    // Back off if workers keep crashing right after start
    const now = Date.now();
    recentCrashes.push(now);
    while (recentCrashes.length && now - recentCrashes[0] > 60000) recentCrashes.shift();
    const delay = recentCrashes.length > 5 ? 5000 : 500;
    setTimeout(() => { if (!shuttingDown) cluster.fork(); }, delay);
  });

  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[cluster] ${signal} received, stopping workers...`);
    for (const worker of Object.values(cluster.workers)) worker.process.kill('SIGTERM');
    const check = setInterval(() => {
      if (Object.keys(cluster.workers).length === 0) {
        clearInterval(check);
        process.exit(0);
      }
    }, 200);
    setTimeout(() => process.exit(1), 25000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  return true;
}

module.exports = { startClusterIfEnabled };
