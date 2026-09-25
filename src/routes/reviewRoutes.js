const router = require('express').Router({ mergeParams: true });
// NOTE: adjust these two requires to match your actual auth middleware file
// and exported function names (e.g. it might be `protect` / `isAdmin`
// instead of `authenticate` / `requireAdmin`) — send me your middleware/auth.js
// and I'll line these up exactly.
const { authenticate, requireAdmin } = require('../middleware/auth');
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
router.get('/admin/reviews', authenticate, requireAdmin, reviewController.getAllReviews);
router.delete('/admin/reviews/:id', authenticate, requireAdmin, reviewController.adminDeleteReview);

module.exports = router;
