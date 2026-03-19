const IORedis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_PREFIX = 'markup:html:';
const META_PREFIX = 'markup:meta:';
const ASSET_PREFIX = 'markup:asset:';
const ASSET_META_PREFIX = 'markup:asset-meta:';
const INDEX_KEY = 'markup:cached-keys';

let redis = null;

function getRedis() {
  if (!redis) {
    redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
  }
  return redis;
}

// ---- HTML page cache (indefinite, invalidated by watcher) ----

async function setCache(cacheKey, { html, etag, lastModified, contentHash, originalUrl, projectId }) {
  const r = getRedis();
  const meta = JSON.stringify({ etag, lastModified, contentHash, originalUrl, projectId });
  await r.pipeline()
    .set(CACHE_PREFIX + cacheKey, html)
    .set(META_PREFIX + cacheKey, meta)
    .sadd(INDEX_KEY, cacheKey)
    .exec();
}

async function getCache(cacheKey) {
  return getRedis().get(CACHE_PREFIX + cacheKey);
}

async function getMeta(cacheKey) {
  const raw = await getRedis().get(META_PREFIX + cacheKey);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function deleteCache(cacheKey) {
  const r = getRedis();
  await r.pipeline()
    .del(CACHE_PREFIX + cacheKey)
    .del(META_PREFIX + cacheKey)
    .srem(INDEX_KEY, cacheKey)
    .exec();
}

async function clearCache() {
  const r = getRedis();
  const keys = await r.smembers(INDEX_KEY);
  if (keys.length === 0) return;
  const pipeline = r.pipeline();
  for (const key of keys) {
    pipeline.del(CACHE_PREFIX + key);
    pipeline.del(META_PREFIX + key);
  }
  pipeline.del(INDEX_KEY);
  await pipeline.exec();
}

async function getAllKeys() {
  return getRedis().smembers(INDEX_KEY);
}

// ---- Sub-resource cache (CSS, JS, images, fonts — TTL-based, auto-expires) ----

const ASSET_TTL = 3600; // 1 hour — sub-resources change rarely

/**
 * Cache a sub-resource (CSS/JS/image/font).
 * Body is stored as base64 for binary safety.
 */
async function setAsset(url, { contentType, body }) {
  const r = getRedis();
  const meta = JSON.stringify({ contentType });
  const encoded = Buffer.isBuffer(body) ? body.toString('base64') : Buffer.from(body).toString('base64');
  await r.pipeline()
    .set(ASSET_PREFIX + url, encoded, 'EX', ASSET_TTL)
    .set(ASSET_META_PREFIX + url, meta, 'EX', ASSET_TTL)
    .exec();
}

/**
 * Get a cached sub-resource. Returns { contentType, body: Buffer } or null.
 */
async function getAsset(url) {
  const r = getRedis();
  const [encoded, rawMeta] = await r.mget(ASSET_PREFIX + url, ASSET_META_PREFIX + url);
  if (!encoded || !rawMeta) return null;
  try {
    const { contentType } = JSON.parse(rawMeta);
    return { contentType, body: Buffer.from(encoded, 'base64') };
  } catch {
    return null;
  }
}

module.exports = {
  getRedis,
  setCache, getCache, getMeta, deleteCache, clearCache, getAllKeys,
  setAsset, getAsset,
};
