const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');
const express = require('express');
const { logger } = require('./logger');
require('../config/env');

// Where uploaded files live. Two providers behind one interface:
//
//   local       files in LOCAL_UPLOAD_DIR (default server/uploads; on Render,
//               point it at the persistent disk, e.g. /var/data/uploads)
//   cloudinary  used when CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and
//               CLOUDINARY_API_SECRET are all set
//
// Records always store the same relative path ("uploads/<name>" or
// "uploads/documents/<name>") whatever the provider, and GET /uploads/<...>
// serves the local file or redirects to Cloudinary. So the database, the API
// responses and the frontends don't change with the provider, and files saved
// locally before Cloudinary was turned on keep working.
//
// Cloudinary public ids are derived from that path (<folder>/<sub>/<uuid>):
// images are stored as image resources, everything else (PDF, Office files,
// text) as raw resources, which keep their extension in the id.

const SERVER_ROOT = path.join(__dirname, '..');
const LOCAL_DIR = path.resolve(SERVER_ROOT, (process.env.LOCAL_UPLOAD_DIR || '').trim() || 'uploads');

const CLOUDINARY_KEYS = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const cloudinaryKeysSet = CLOUDINARY_KEYS.filter((k) => (process.env[k] || '').trim());
const PROVIDER = cloudinaryKeysSet.length === CLOUDINARY_KEYS.length ? 'cloudinary' : 'local';
const CLOUDINARY_FOLDER = ((process.env.CLOUDINARY_FOLDER || '').trim() || 'kommently').replace(/^\/+|\/+$/g, '');

let cloudinary = null;
if (PROVIDER === 'cloudinary') {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
    secure: true,
  });
}

// Subfolders: '' = uploads/ (screenshots, avatars, logos), 'documents' =
// uploads/documents/ (documents, attachments), 'thumbnails' = uploads/thumbnails/
// (website project thumbnails, saved by utils/websiteThumbnail.js)
const SUBDIRS = ['', 'documents', 'thumbnails'];
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
// A stored key: optional known subfolder + generated name (uuid + extension)
const KEY_RE = /^(?:(documents|thumbnails)\/)?([A-Za-z0-9][\w-]*)(\.[a-z0-9]{1,5})$/;

let announced = false;
function announce() {
  if (announced) return;
  announced = true;
  if (PROVIDER === 'cloudinary') {
    logger.info({ provider: 'cloudinary', folder: CLOUDINARY_FOLDER }, 'File storage: Cloudinary');
  } else {
    if (cloudinaryKeysSet.length) {
      logger.warn({ missing: CLOUDINARY_KEYS.filter((k) => !cloudinaryKeysSet.includes(k)) },
        'Cloudinary is only partly configured: storing uploads on the local disk');
    }
    logger.info({ provider: 'local', dir: LOCAL_DIR }, 'File storage: local disk');
  }
}

// Local folders exist before the first upload (also used for Cloudinary: files
// saved there before the switch are still served from it)
function ensureLocalDirs() {
  for (const sub of SUBDIRS) {
    try {
      fs.mkdirSync(path.join(LOCAL_DIR, sub), { recursive: true });
    } catch (err) {
      if (PROVIDER === 'local') logger.error({ err, dir: LOCAL_DIR }, 'Cannot create the uploads folder');
    }
  }
}
ensureLocalDirs();

/** "uploads/documents/x.pdf" -> { sub: 'documents', name: 'x', ext: '.pdf', key } or null */
function parseStoredPath(relPath) {
  if (typeof relPath !== 'string') return null;
  const clean = relPath.replace(/^\/+/, '');
  if (!clean.startsWith('uploads/')) return null;
  const key = clean.slice('uploads/'.length);
  const m = KEY_RE.exec(key);
  if (!m) return null;
  return { sub: m[1] || '', name: m[2], ext: m[3].toLowerCase(), key };
}

function cloudinaryTarget({ sub, name, ext }) {
  const base = [CLOUDINARY_FOLDER, sub].filter(Boolean).join('/');
  return IMAGE_EXT.has(ext)
    ? { resourceType: 'image', publicId: `${base}/${name}`, format: ext.slice(1) }
    : { resourceType: 'raw', publicId: `${base}/${name}${ext}` };
}

function cloudinaryUrl(parsed) {
  const t = cloudinaryTarget(parsed);
  return cloudinary.url(t.publicId, {
    resource_type: t.resourceType,
    type: 'upload',
    secure: true,
    urlAnalytics: false, // no SDK tracking query string
    ...(t.format ? { format: t.format } : {}),
  });
}

function localPathFor(parsed) {
  const abs = path.resolve(LOCAL_DIR, parsed.key);
  return abs.startsWith(LOCAL_DIR + path.sep) ? abs : null;
}

function unlinkQuiet(p) {
  if (p) fs.unlink(p, () => {});
}

async function destroyInCloudinary(parsed) {
  const t = cloudinaryTarget(parsed);
  try {
    await cloudinary.uploader.destroy(t.publicId, { resource_type: t.resourceType, invalidate: true });
  } catch (err) {
    logger.warn({ err: err?.message || err, publicId: t.publicId }, 'Cloudinary delete failed');
  }
}

// Writes the incoming stream to disk and resolves with its byte count
function writeStream(stream, dest) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    let size = 0;
    stream.on('data', (chunk) => { size += chunk.length; });
    stream.on('error', (err) => { out.destroy(); reject(err); });
    out.on('error', reject);
    out.on('finish', () => resolve(size));
    stream.pipe(out);
  });
}

/**
 * Multer storage engine. `subdir` is '' (uploads/) or 'documents'; `extensionFor`
 * maps the file's mimetype to the stored extension (never the client's name).
 *
 * The file object keeps multer's disk-storage shape (filename, path, size), so
 * controllers work unchanged: `path` is a readable local copy for the rest of
 * the request (the PDF page counter reads it). With Cloudinary that copy is a
 * temporary file, deleted when the response ends.
 */
function createUploadStorage({ subdir = '', extensionFor }) {
  if (!SUBDIRS.includes(subdir)) throw new Error(`Unknown upload folder: ${subdir}`);
  announce();
  return {
    _handleFile(req, file, cb) {
      const filename = `${randomUUID()}${extensionFor(file.mimetype)}`;
      const relPath = ['uploads', subdir, filename].filter(Boolean).join('/');

      if (PROVIDER === 'local') {
        const dest = path.join(LOCAL_DIR, subdir, filename);
        writeStream(file.stream, dest)
          .then((size) => cb(null, { destination: path.dirname(dest), filename, path: dest, size, storage: 'local', storedPath: relPath }))
          .catch((err) => { unlinkQuiet(dest); cb(err); });
        return;
      }

      const tmp = path.join(os.tmpdir(), `kommently-upload-${filename}`);
      // The local copy lives until the response is done
      if (req.res) req.res.once('close', () => unlinkQuiet(tmp));
      writeStream(file.stream, tmp)
        .then(async (size) => {
          const t = cloudinaryTarget(parseStoredPath(relPath));
          await cloudinary.uploader.upload(tmp, {
            public_id: t.publicId,
            resource_type: t.resourceType,
            type: 'upload',
            overwrite: false,
            unique_filename: false,
            use_filename: false,
          });
          cb(null, { destination: os.tmpdir(), filename, path: tmp, size, storage: 'cloudinary', storedPath: relPath });
        })
        .catch((err) => {
          unlinkQuiet(tmp);
          logger.error({ err: err?.message || err }, 'Cloudinary upload failed');
          const e = new Error('The file could not be stored. Please try again.');
          e.statusCode = 502;
          cb(e);
        });
    },

    _removeFile(req, file, cb) {
      removeUploadedFile(file).then(() => cb(null), () => cb(null));
    },
  };
}

/**
 * Store a file the server produced itself (not a multer upload) with the active
 * provider. Resolves with its stored path ("uploads/<subdir>/<uuid><ext>").
 */
async function saveBuffer(buffer, { subdir = '', ext, mimetype }) {
  if (!SUBDIRS.includes(subdir)) throw new Error(`Unknown upload folder: ${subdir}`);
  announce();
  const filename = `${randomUUID()}${ext}`;
  const relPath = ['uploads', subdir, filename].filter(Boolean).join('/');
  if (PROVIDER === 'local') {
    await fs.promises.writeFile(path.join(LOCAL_DIR, subdir, filename), buffer);
    return relPath;
  }
  const t = cloudinaryTarget(parseStoredPath(relPath));
  await cloudinary.uploader.upload(`data:${mimetype || 'application/octet-stream'};base64,${buffer.toString('base64')}`, {
    public_id: t.publicId,
    resource_type: t.resourceType,
    type: 'upload',
    overwrite: false,
    unique_filename: false,
    use_filename: false,
  });
  return relPath;
}

/** Delete a file multer stored during this request (a refused upload). */
async function removeUploadedFile(file) {
  if (!file) return;
  unlinkQuiet(file.path);
  if (file.storage === 'cloudinary' && cloudinary) {
    const parsed = parseStoredPath(file.storedPath);
    if (parsed) await destroyInCloudinary(parsed);
  }
}

/**
 * Delete stored files by their relative path ("uploads/..."). Ignores missing
 * files and anything that isn't a stored upload. Removes the local copy (files
 * from before a switch to Cloudinary) and, with Cloudinary on, the remote one.
 * Fire-and-forget.
 */
function deleteStoredFiles(relativePaths) {
  for (const rel of relativePaths || []) {
    const parsed = parseStoredPath(rel);
    if (!parsed) continue;
    unlinkQuiet(localPathFor(parsed));
    if (cloudinary) destroyInCloudinary(parsed);
  }
}

/**
 * GET /uploads/<...>: the local file when it exists, else (Cloudinary on) a
 * redirect to the Cloudinary copy. Uploads are user-controlled, so a file never
 * renders as an active document on our origin: no MIME sniffing, and anything
 * other than an image or PDF is sandboxed and downloaded.
 */
const INLINE_UPLOAD_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf']);
function uploadsRouter() {
  const router = express.Router();
  router.use(express.static(LOCAL_DIR, {
    dotfiles: 'ignore',
    // Names are random and never reused, so a stored file never changes: the
    // browser keeps it instead of revalidating every thumbnail on each
    // dashboard visit (same lifetime as the Cloudinary redirect below)
    maxAge: '1d',
    immutable: true,
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // The app (app.<domain>) shows these from the API host (api.<domain>):
      // allow the same site, not just the same origin (helmet's default).
      res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
      if (!INLINE_UPLOAD_EXT.has(path.extname(filePath).toLowerCase())) {
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
        res.setHeader('Content-Disposition', 'attachment');
      }
    },
  }));
  router.get(/.*/, (req, res, next) => {
    const parsed = cloudinary && parseStoredPath(`uploads${req.path}`);
    // Not ours: fall through (a proxied site's own /uploads/... request goes on
    // to the proxy catch-all in app.js; anything else ends in the 404 handler)
    if (!parsed) return next();
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Names are unique and never reused, so the target never changes
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.redirect(302, cloudinaryUrl(parsed));
  });
  return router;
}

/** Local path of a stored file (it may not exist on this disk), or null. */
function localFile(parsed) {
  return parsed ? localPathFor(parsed) : null;
}

/** Cloudinary URL of a stored file when Cloudinary is on, else null. */
function remoteUrl(parsed) {
  return parsed && cloudinary ? cloudinaryUrl(parsed) : null;
}

module.exports = {
  PROVIDER,
  localFile,
  remoteUrl,
  LOCAL_DIR,
  createUploadStorage,
  saveBuffer,
  removeUploadedFile,
  deleteStoredFiles,
  uploadsRouter,
  parseStoredPath,
};
