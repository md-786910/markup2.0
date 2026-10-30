const fs = require('fs');
const path = require('path');
const Organization = require('../models/Organization');
const { getEffectiveLimitsAsync } = require('../config/plans');

// Per-organization storage quota. Usage is a counter on the org
// (storageUsedBytes): reserved when files are uploaded, released when they are
// deleted. Files uploaded before quotas existed are not counted.

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

function uploadedFiles(req) {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') return Object.values(req.files).flat();
  return [];
}

// Remove multer's files for a request that was rejected
function discardUploads(req) {
  for (const f of uploadedFiles(req)) {
    fs.unlink(f.path, () => {});
  }
}

/**
 * Reserve space for this request's uploads. Returns null when allowed, or an
 * error body (and deletes the uploaded files) when the quota would be exceeded.
 */
async function reserveStorage(orgId, req) {
  const files = uploadedFiles(req);
  const bytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
  if (!bytes || !orgId) return null;

  const org = await Organization.findById(orgId).select('plan limitOverrides storageUsedBytes');
  if (!org) return null;
  const limitMb = (await getEffectiveLimitsAsync(org)).maxStorageMB;
  if (limitMb != null) {
    const limitBytes = limitMb * 1024 * 1024;
    // Atomic: only increments while the result stays within the limit
    const updated = await Organization.findOneAndUpdate(
      { _id: orgId, $expr: { $lte: [{ $add: [{ $ifNull: ['$storageUsedBytes', 0] }, bytes] }, limitBytes] } },
      { $inc: { storageUsedBytes: bytes } },
    );
    if (!updated) {
      discardUploads(req);
      return {
        message: `Storage limit reached (${limitMb >= 1024 ? `${limitMb / 1024} GB` : `${limitMb} MB`}). Delete old files or upgrade your plan.`,
        code: 'STORAGE_LIMIT',
      };
    }
    return null;
  }
  await Organization.updateOne({ _id: orgId }, { $inc: { storageUsedBytes: bytes } });
  return null;
}

/** Give back quota for deleted files (sizes in bytes; unknown sizes count as 0). */
async function releaseStorage(orgId, bytes) {
  if (!orgId || !bytes) return;
  // Pipeline update so usage never drops below zero (files from before quotas weren't counted)
  await Organization.updateOne({ _id: orgId }, [
    { $set: { storageUsedBytes: { $max: [0, { $subtract: [{ $ifNull: ['$storageUsedBytes', 0] }, bytes] }] } } },
  ], { updatePipeline: true });
}

/**
 * Delete stored files by their relative path ("uploads/..."), ignoring missing
 * ones and anything outside the uploads folder. Fire-and-forget.
 */
function deleteStoredFiles(relativePaths) {
  for (const rel of relativePaths) {
    if (!rel || typeof rel !== 'string') continue;
    const abs = path.resolve(path.join(__dirname, '..'), rel);
    if (!abs.startsWith(UPLOADS_ROOT + path.sep)) continue;
    fs.unlink(abs, () => {});
  }
}

/** Undo reserveStorage for a request rejected afterwards: delete its files and give the quota back. */
async function releaseUploads(orgId, req) {
  const bytes = uploadedFiles(req).reduce((sum, f) => sum + (f.size || 0), 0);
  discardUploads(req);
  await releaseStorage(orgId, bytes);
}

/** Express middleware (after multer) for routes where req.organization is set. */
async function enforceStorageQuota(req, res, next) {
  try {
    const error = await reserveStorage(req.organization?._id, req);
    if (error) return res.status(403).json(error);
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { reserveStorage, releaseStorage, releaseUploads, deleteStoredFiles, enforceStorageQuota, discardUploads };
