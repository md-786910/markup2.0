const multer = require('multer');
const { createUploadStorage } = require('../utils/fileStorage');

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

// Local disk (LOCAL_UPLOAD_DIR/documents) or Cloudinary, see utils/fileStorage.js
const storage = createUploadStorage({ subdir: 'documents', extensionFor: (mimetype) => EXTENSIONS[mimetype] });

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

// Support request attachments: screenshots and PDFs only, up to 5 MB each
const SUPPORT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
uploadDocument.supportAttachments = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!SUPPORT_TYPES.includes(file.mimetype)) {
      const error = new Error('Attach images or PDF files only');
      error.statusCode = 400;
      return cb(error);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = uploadDocument;
