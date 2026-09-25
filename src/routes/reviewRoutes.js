const router = require('express').Router({ mergeParams: true });
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const reviewController = require('../controllers/reviewController');

// Public — anyone can read reviews for a book, logged in or not.
router.get('/books/:bookId/reviews', reviewController.getReviewsForBook);

// Auth required — must be logged in (and, per reviewService, must actually
// have access to the book) to write, edit, or delete a review.
router.get('/books/:bookId/reviews/me', authenticate, reviewController.getMyReviewForBook);
router.post('/books/:bookId/reviews', authenticate, reviewController.createReview);
router.patch('/reviews/:id', authenticate, reviewController.updateReview);
router.delete('/reviews/:id', authenticate, reviewController.deleteReview);

// Admin moderation — remove fake/spam reviews, list everything.
router.get('/admin/reviews', authenticate, authorize('ADMIN'), reviewController.getAllReviews);
router.delete('/admin/reviews/:id', authenticate, authorize('ADMIN'), reviewController.adminDeleteReview);

module.exports = router;
