const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const bookService = require('./bookService');

const MIN_RATING = 1;
const MAX_RATING = 5;

function validateRating(rating) {
  const n = Number(rating);
  if (!Number.isInteger(n) || n < MIN_RATING || n > MAX_RATING) {
    throw ApiError.badRequest(`rating must be an integer between ${MIN_RATING} and ${MAX_RATING}`);
  }
  return n;
}

// A review can only be left on a book the user actually has access to —
// reuses the exact same check readBook/progress writes use, so someone can't
// rate a paid book they never bought or a membership book without a sub.
async function assertCanReview(userId, bookId) {
  return bookService.assertAccess(userId, bookId);
}

// Recomputes Book.averageRating / reviewCount from the real Review rows.
// Called after every create/update/delete so these never go stale — never
// set by hand elsewhere.
async function recalculateBookRating(bookId) {
  const agg = await prisma.review.aggregate({
    where: { bookId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.book.update({
    where: { id: bookId },
    data: {
      averageRating: agg._avg.rating || 0,
      reviewCount: agg._count.rating,
    },
  });
}

async function createReview(userId, bookId, { rating, comment }) {
  await assertCanReview(userId, bookId);
  const validRating = validateRating(rating);

  const existing = await prisma.review.findUnique({
    where: { userId_bookId: { userId, bookId } },
  });
  if (existing) {
    throw ApiError.conflict('You already reviewed this book. Edit your existing review instead.');
  }

  const review = await prisma.review.create({
    data: { userId, bookId, rating: validRating, comment: comment || null },
  });

  await recalculateBookRating(bookId);
  return review;
}

async function updateReview(userId, reviewId, { rating, comment }) {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing || existing.userId !== userId) throw ApiError.notFound('Review not found');

  const data = {};
  if (rating !== undefined) data.rating = validateRating(rating);
  if (comment !== undefined) data.comment = comment || null;

  const review = await prisma.review.update({ where: { id: reviewId }, data });
  await recalculateBookRating(existing.bookId);
  return review;
}

async function deleteReview(userId, reviewId) {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing || existing.userId !== userId) throw ApiError.notFound('Review not found');

  await prisma.review.delete({ where: { id: reviewId } });
  await recalculateBookRating(existing.bookId);
}

// Admin moderation — removes any review regardless of owner (spam, fake,
// abusive content) and keeps the book's rating in sync afterward.
async function adminDeleteReview(reviewId) {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) throw ApiError.notFound('Review not found');

  await prisma.review.delete({ where: { id: reviewId } });
  await recalculateBookRating(existing.bookId);
}

async function getReviewsForBook(bookId, { page = 1, limit = 20 } = {}) {
  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where: { bookId },
      include: { user: { select: { id: true, name: true } } }, // never expose email/etc. publicly
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.count({ where: { bookId } }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getMyReviewForBook(userId, bookId) {
  return prisma.review.findUnique({ where: { userId_bookId: { userId, bookId } } });
}

// Admin-wide review listing for moderation dashboards.
async function getAllReviews({ page = 1, limit = 20 } = {}) {
  const [items, total] = await Promise.all([
    prisma.review.findMany({
      include: {
        book: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.count(),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

module.exports = {
  createReview,
  updateReview,
  deleteReview,
  adminDeleteReview,
  getReviewsForBook,
  getMyReviewForBook,
  getAllReviews,
  recalculateBookRating,
};
