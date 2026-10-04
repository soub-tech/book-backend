const router = require('express').Router();
const collectionController = require('../controllers/collectionController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { collection: schemas } = require('../utils/validators');

// Public
router.get('/', collectionController.listCollections);
router.get('/:slug', validate({ params: schemas.slugParam }), collectionController.getCollectionBySlug);

// Admin-only management
router.post('/', authenticate, authorize('ADMIN'), validate({ body: schemas.create }), collectionController.createCollection);
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: schemas.idParam, body: schemas.update }),
  collectionController.updateCollection
);
router.delete('/:id', authenticate, authorize('ADMIN'), validate({ params: schemas.idParam }), collectionController.deleteCollection);

// Admin-only: assign/remove books. NOTE: these use /:id (the collection's
// real id), not /:slug, so they don't collide with the public GET /:slug
// route above.
router.post(
  '/:id/books',
  authenticate,
  authorize('ADMIN'),
  validate({ params: schemas.idParam, body: schemas.addBook }),
  collectionController.addBook
);
router.delete(
  '/:id/books/:bookId',
  authenticate,
  authorize('ADMIN'),
  validate({ params: schemas.bookIdParam }),
  collectionController.removeBook
);

module.exports = router;
