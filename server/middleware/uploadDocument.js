const multer = require('multer');
const path = require('path');
const { randomUUID } = require('crypto');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads', 'documents'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  cb(null, allowed.includes(file.mimetype));
};

const uploadDocument = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

module.exports = uploadDocument;
