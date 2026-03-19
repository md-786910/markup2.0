const { Queue, Worker } = require('bullmq');
const axios = require('axios');
const crypto = require('crypto');
const { getAllKeys, getMeta, deleteCache, getRedis } = require('../utils/redisCache');

const CHECK_INTERVAL_MS = 60000; // 60 seconds
const QUEUE_NAME = 'cache-check';

/**
 * Schedule a repeatable job that fires every 60s.
 * Idempotent — safe to call from every cluster worker; BullMQ deduplicates by jobId.
 */
async function scheduleCacheWatcher() {
  const connection = getRedis();
  const queue = new Queue(QUEUE_NAME, { connection });
  await queue.add(
    'check-all',
    {},
    { repeat: { every: CHECK_INTERVAL_MS }, jobId: 'check-all-repeatable' }
  );
}

/**
 * Start a worker that checks upstream pages for changes.
 * Reads cache metadata from Redis, checks upstream via ETag/Last-Modified/content hash.
 * Only invalidates entries whose content has actually changed.
 */
function startCacheWorker(upstreamAgent) {
  const connection = getRedis();
  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const keys = await getAllKeys();
      if (keys.length === 0) return;

      for (const cacheKey of keys) {
        try {
          const meta = await getMeta(cacheKey);
          if (!meta || !meta.originalUrl) continue;

          // Try HEAD first — cheap check using ETag / Last-Modified
          const headRes = await axios.head(meta.originalUrl, {
            timeout: 8000,
            httpsAgent: upstreamAgent,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            validateStatus: () => true,
          });

          let changed = false;

          if (meta.etag && headRes.headers['etag']) {
            changed = headRes.headers['etag'] !== meta.etag;
          } else if (meta.lastModified && headRes.headers['last-modified']) {
            changed = headRes.headers['last-modified'] !== meta.lastModified;
          } else {
            // No cache headers — full GET + content hash comparison
            const getRes = await axios.get(meta.originalUrl, {
              responseType: 'arraybuffer',
              timeout: 20000,
              httpsAgent: upstreamAgent,
              decompress: true,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Encoding': 'gzip, deflate, br',
              },
              validateStatus: () => true,
            });
            const newHash = crypto.createHash('md5').update(getRes.data).digest('hex');
            changed = newHash !== meta.contentHash;
          }

          if (changed) {
            await deleteCache(cacheKey);
          }
        } catch {
          // Network error — leave cache entry, retry next interval
        }
      }
    },
    { connection }
  );

  worker.on('failed', (job, err) => {
    console.error('Cache watcher job failed:', err.message);
  });

  return worker;
}

module.exports = { scheduleCacheWatcher, startCacheWorker };
