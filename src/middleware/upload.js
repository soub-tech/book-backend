const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// Files are held in memory just long enough to be sent to cloud storage
// (see services/storageService.js) — nothing is written to the server's disk,
// because Render wipes that disk on every redeploy.

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    return cb(ApiError.badRequest('Cover image must be JPEG, PNG, or WEBP'));
  }
  cb(null, true);
};

const bookFileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'application/epub+zip', 'application/x-mobipocket-ebook'];
  if (!allowed.includes(file.mimetype)) {
    return cb(ApiError.badRequest('Book file must be PDF, EPUB, or MOBI'));
  }
  cb(null, true);
};

const uploadCover = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadBookFile = multer({
  storage: multer.memoryStorage(),
  fileFilter: bookFileFilter,
  limits: { fileSize: env.upload.maxMb * 1024 * 1024 },
});

module.exports = { uploadCover, uploadBookFile };
