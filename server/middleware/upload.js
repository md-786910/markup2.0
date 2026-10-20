const multer = require('multer');
const path = require('path');
const { randomUUID } = require('crypto');

// Allowed mimetypes -> stored extension. The extension comes from this map, never
// from the client-supplied filename, so an upload can't be stored as .html/.svg.
const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    cb(null, `${randomUUID()}${EXTENSIONS[file.mimetype]}`);
  },
});

const fileFilter = (req, file, cb) => {
  cb(null, Object.prototype.hasOwnProperty.call(EXTENSIONS, file.mimetype));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = upload;
