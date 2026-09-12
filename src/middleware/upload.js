const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const coverDir = path.join(process.cwd(), env.upload.dir, 'covers');
const bookDir = path.join(process.cwd(), env.upload.dir, 'books');
[coverDir, bookDir].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

function storageFor(dir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const unique = crypto.randomBytes(16).toString('hex');
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
}

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
  storage: storageFor(coverDir),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadBookFile = multer({
  storage: storageFor(bookDir),
  fileFilter: bookFileFilter,
  limits: { fileSize: env.upload.maxMb * 1024 * 1024 },
});

module.exports = { uploadCover, uploadBookFile };
