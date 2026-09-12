const router = require('express').Router();
const bookController = require('../controllers/bookController');
const { authenticate, optionalAuthenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadCover, uploadBookFile } = require('../middleware/upload');
const { book: schemas } = require('../utils/validators');

// Public browsing (optional auth so hasAccess can be computed when logged in)
router.get('/', optionalAuthenticate, validate({ query: schemas.list }), bookController.listBooks);
router.get('/slug/:slug', optionalAuthenticate, bookController.getBookBySlug);
router.get('/:id', optionalAuthenticate, validate({ params: schemas.idParam }), bookController.getBook);

// Requires a verified, entitled user — the core protected-content endpoint
router.get('/:id/read', authenticate, validate({ params: schemas.idParam }), bookController.readBook);

// Admin-only management
router.post('/', authenticate, authorize('ADMIN'), validate({ body: schemas.create }), bookController.createBook);
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: schemas.idParam, body: schemas.update }),
  bookController.updateBook
);
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: schemas.idParam }),
  bookController.deleteBook
);
router.post(
  '/:id/cover',
  authenticate,
  authorize('ADMIN'),
  validate({ params: schemas.idParam }),
  uploadCover.single('cover'),
  bookController.uploadCoverImage
);
router.post(
  '/:id/file',
  authenticate,
  authorize('ADMIN'),
  validate({ params: schemas.idParam }),
  uploadBookFile.single('file'),
  bookController.uploadBookFile
);
router.get(
  '/:id/stats',
  authenticate,
  authorize('ADMIN'),
  validate({ params: schemas.idParam }),
  bookController.getBookStats
);

module.exports = router;
