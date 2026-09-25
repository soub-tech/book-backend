const catchAsync = require('../utils/catchAsync');
const reviewService = require('../services/reviewService');

const createReview = catchAsync(async (req, res) => {
  const review = await reviewService.createReview(req.user.id, req.params.bookId, req.body);
  res.status(201).json({ success: true, data: review });
});

const updateReview = catchAsync(async (req, res) => {
  const review = await reviewService.updateReview(req.user.id, req.params.id, req.body);
  res.json({ success: true, data: review });
});

const deleteReview = catchAsync(async (req, res) => {
  await reviewService.deleteReview(req.user.id, req.params.id);
  res.json({ success: true, message: 'Review deleted' });
});

const getReviewsForBook = catchAsync(async (req, res) => {
  const result = await reviewService.getReviewsForBook(req.params.bookId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  res.json({ success: true, data: result });
});

const getMyReviewForBook = catchAsync(async (req, res) => {
  const review = await reviewService.getMyReviewForBook(req.user.id, req.params.bookId);
  res.json({ success: true, data: review });
});

// --- Admin moderation ---

const adminDeleteReview = catchAsync(async (req, res) => {
  await reviewService.adminDeleteReview(req.params.id);
  res.json({ success: true, message: 'Review removed' });
});

const getAllReviews = catchAsync(async (req, res) => {
  const result = await reviewService.getAllReviews({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  res.json({ success: true, data: result });
});

module.exports = {
  createReview,
  updateReview,
  deleteReview,
  getReviewsForBook,
  getMyReviewForBook,
  adminDeleteReview,
  getAllReviews,
};
