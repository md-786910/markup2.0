const multer = require('multer');
const path = require('path');
const { randomUUID } = require('crypto');

// Allowed mimetypes -> stored extension. The extension comes from this map, never
// from the client-supplied filename, so an upload can't be stored as .html/.svg.
const EXTENSIONS = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'text/plain': '.txt',
  'text/csv': '.csv',
};

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads', 'documents'),
  filename: (req, file, cb) => {
    cb(null, `${randomUUID()}${EXTENSIONS[file.mimetype]}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!Object.prototype.hasOwnProperty.call(EXTENSIONS, file.mimetype)) {
    const error = new Error('Unsupported file type');
    error.statusCode = 400;
    return cb(error);
  }
  cb(null, true);
};

const uploadDocument = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

module.exports = uploadDocument;
