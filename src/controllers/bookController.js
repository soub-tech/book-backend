const path = require('path');
const catchAsync = require('../utils/catchAsync');
const bookService = require('../services/bookService');
const ApiError = require('../utils/ApiError');

const listBooks = catchAsync(async (req, res) => {
  const result = await bookService.listBooks(req.query);

  // Attach a lightweight hasAccess flag per book for logged-in users so the
  // frontend can show "Read" vs "Buy" vs "Subscribe" without extra calls.
  if (req.user) {
    const items = await Promise.all(
      result.items.map(async (book) => ({
        ...book,
        hasAccess: await bookService.userHasAccess(req.user.id, book),
      }))
    );
    return res.json({ success: true, data: { ...result, items } });
  }

  res.json({ success: true, data: result });
});

const getBook = catchAsync(async (req, res) => {
  const book = await bookService.getBookById(req.params.id);
  const hasAccess = req.user ? await bookService.userHasAccess(req.user.id, book) : book.accessType === 'FREE';
  res.json({ success: true, data: { ...book, hasAccess } });
});

const getBookBySlug = catchAsync(async (req, res) => {
  const book = await bookService.getBookBySlug(req.params.slug);
  const hasAccess = req.user ? await bookService.userHasAccess(req.user.id, book) : book.accessType === 'FREE';
  res.json({ success: true, data: { ...book, hasAccess } });
});

// Serves the actual book content — this is the endpoint that must never be
// reachable without a verified access check, regardless of what the client
// requests or believes it's entitled to.
const readBook = catchAsync(async (req, res) => {
  const book = await bookService.assertAccess(req.user.id, req.params.id);
  if (!book.fileUrl) throw ApiError.notFound('No file has been uploaded for this book yet');

  await require('../services/progressService').touchOpened(req.user.id, book.id);

  // fileUrl stores a relative path under the upload dir; resolve and stream it.
  res.sendFile(path.resolve(book.fileUrl));
});

const createBook = catchAsync(async (req, res) => {
  const book = await bookService.createBook(req.body);
  res.status(201).json({ success: true, data: book });
});

const updateBook = catchAsync(async (req, res) => {
  const book = await bookService.updateBook(req.params.id, req.body);
  res.json({ success: true, data: book });
});

const deleteBook = catchAsync(async (req, res) => {
  await bookService.deleteBook(req.params.id);
  res.json({ success: true, message: 'Book deleted' });
});

const uploadCoverImage = catchAsync(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const book = await bookService.setCoverImage(req.params.id, req.file.path);
  res.json({ success: true, data: book });
});

const uploadBookFile = catchAsync(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const book = await bookService.setBookFile(req.params.id, req.file.path);
  res.json({ success: true, data: book });
});

const getBookStats = catchAsync(async (req, res) => {
  const stats = await bookService.getBookStats(req.params.id);
  res.json({ success: true, data: stats });
});

module.exports = {
  listBooks,
  getBook,
  getBookBySlug,
  readBook,
  createBook,
  updateBook,
  deleteBook,
  uploadCoverImage,
  uploadBookFile,
  getBookStats,
};
