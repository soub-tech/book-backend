const catchAsync = require('../utils/catchAsync');
const progressService = require('../services/progressService');
const bookService = require('../services/bookService');

// Access must be verified on every progress write — otherwise a user could
// record (and later claim to have purchased) a book by simply POSTing
// progress for its ID.
const updateProgress = catchAsync(async (req, res) => {
  await bookService.assertAccess(req.user.id, req.body.bookId);
  const progress = await progressService.upsertProgress(req.user.id, req.body);
  res.json({ success: true, data: progress });
});

const getProgressForBook = catchAsync(async (req, res) => {
  const progress = await progressService.getProgressForBook(req.user.id, req.params.bookId);
  res.json({ success: true, data: progress });
});

const getContinueReading = catchAsync(async (req, res) => {
  const items = await progressService.getContinueReading(req.user.id);
  res.json({ success: true, data: items });
});

const getHistory = catchAsync(async (req, res) => {
  const items = await progressService.getReadingHistory(req.user.id);
  res.json({ success: true, data: items });
});

module.exports = { updateProgress, getProgressForBook, getContinueReading, getHistory };
