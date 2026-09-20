const catchAsync = require('../utils/catchAsync');
const progressService = require('../services/progressService');
const bookService = require('../services/bookService');
const prisma = require('../config/db');

// Access must be verified on every progress write — otherwise a user could
// record (and later claim to have purchased) a book by simply POSTing
// progress for its ID.
const updateProgress = catchAsync(async (req, res) => {
  await bookService.assertAccess(req.user.id, req.body.bookId);
  const progress = await progressService.upsertProgress(req.user.id, req.body);
  res.json({ success: true, data: progress });
});

// Called by the reader once a minute while a book is actually open and the
// browser tab is visible — adds real, measured minutes to the user's
// reading-time total and updates their activity streak. Capped server-side
// (see progressService.addReadingMinutes) against a client sending oversized
// values.
const heartbeat = catchAsync(async (req, res) => {
  const minutes = Number(req.body.minutes) || 1;
  await progressService.addReadingMinutes(req.user.id, minutes);
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { currentStreak: true, totalReadingMinutes: true },
  });
  res.json({ success: true, data: user });
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

module.exports = { updateProgress, heartbeat, getProgressForBook, getContinueReading, getHistory };
