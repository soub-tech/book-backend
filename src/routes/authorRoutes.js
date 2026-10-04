const router = require('express').Router();
const authorController = require('../controllers/authorController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { author: schemas } = require('../utils/validators');

// Public
router.get('/', authorController.listAuthors);
router.get('/:slug', validate({ params: schemas.slugParam }), authorController.getAuthorBySlug);

// Admin-only management
router.post('/', authenticate, authorize('ADMIN'), validate({ body: schemas.create }), authorController.createAuthor);
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: schemas.idParam, body: schemas.update }),
  authorController.updateAuthor
);
router.delete('/:id', authenticate, authorize('ADMIN'), validate({ params: schemas.idParam }), authorController.deleteAuthor);

module.exports = router;
