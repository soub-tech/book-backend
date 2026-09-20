const prisma = require('../config/db');
const bookService = require('./bookService');

// Called on any genuine reading activity (opening a book, progress update).
// Tracks consecutive CALENDAR DAYS of activity — not a fabricated formula —
// by comparing today's date to the last recorded active date.
async function recordActivity(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { lastActiveDate: true, currentStreak: true } });
  if (!user) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const last = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  if (last) last.setHours(0, 0, 0, 0);

  let nextStreak = user.currentStreak;
  if (!last) {
    nextStreak = 1; // first ever activity
  } else {
    const dayDiff = Math.round((today - last) / (1000 * 60 * 60 * 24));
    if (dayDiff === 0) {
      return; // already recorded today — no change, avoids double-counting repeated activity same day
    } else if (dayDiff === 1) {
      nextStreak = user.currentStreak + 1; // consecutive day
    } else {
      nextStreak = 1; // streak broken, restart
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { currentStreak: nextStreak, lastActiveDate: today },
  });
}

// Adds real, measured minutes to the user's reading-time total. Called by a
// heartbeat ping from the reader while a book is actually open and the tab
// is visible (see the frontend reader component) — capped per call so a
// client can't inflate it by sending oversized values.
async function addReadingMinutes(userId, minutes) {
  const safeMinutes = Math.max(0, Math.min(5, Math.round(minutes))); // cap protects against abuse/bugs
  await prisma.user.update({
    where: { id: userId },
    data: { totalReadingMinutes: { increment: safeMinutes } },
  });
  await recordActivity(userId);
}

// Progress can only be written for books the user actually has access to —
// call site (controller) is responsible for calling bookService.assertAccess
// first so a user can't fabricate progress on a book they never
// purchased/subscribed to.
async function upsertProgress(userId, { bookId, currentPage, percentComplete, lastPosition }) {
  const clampedPercent = Math.max(0, Math.min(100, percentComplete));
  const isCompleted = clampedPercent >= 100;

  const existing = await prisma.readingProgress.findUnique({
    where: { userId_bookId: { userId, bookId } },
  });

  const data = {
    currentPage: currentPage ?? existing?.currentPage ?? 0,
    percentComplete: clampedPercent,
    lastPosition: lastPosition ?? existing?.lastPosition ?? null,
    lastOpenedAt: new Date(),
    isCompleted,
    completedAt: isCompleted ? (existing?.completedAt || new Date()) : null,
  };

  return prisma.readingProgress.upsert({
    where: { userId_bookId: { userId, bookId } },
    update: data,
    create: { userId, bookId, ...data },
  }).then(async (result) => {
    await recordActivity(userId);
    return result;
  });
}

async function getProgressForBook(userId, bookId) {
  return prisma.readingProgress.findUnique({ where: { userId_bookId: { userId, bookId } } });
}

// Marks a book as "opened" without changing progress — used by the reader
// when the user opens a book to update lastOpenedAt / create an initial row.
async function touchOpened(userId, bookId) {
  const result = await prisma.readingProgress.upsert({
    where: { userId_bookId: { userId, bookId } },
    update: { lastOpenedAt: new Date() },
    create: { userId, bookId, lastOpenedAt: new Date() },
  });
  await recordActivity(userId);
  return result;
}

async function getContinueReading(userId, take = 10) {
  return prisma.readingProgress.findMany({
    where: { userId, isCompleted: false },
    include: { book: true },
    orderBy: { lastOpenedAt: 'desc' },
    take,
  });
}

async function getReadingHistory(userId) {
  return prisma.readingProgress.findMany({
    where: { userId, isCompleted: true },
    include: { book: true },
    orderBy: { completedAt: 'desc' },
  });
}

async function getDashboard(userId) {
  const [totalStarted, totalCompleted, currentlyReading, recentlyRead, purchasedBooks, membership] =
    await Promise.all([
      prisma.readingProgress.count({ where: { userId } }),
      prisma.readingProgress.count({ where: { userId, isCompleted: true } }),
      prisma.readingProgress.findMany({
        where: { userId, isCompleted: false },
        include: { book: true },
        orderBy: { lastOpenedAt: 'desc' },
        take: 10,
      }),
      prisma.readingProgress.findMany({
        where: { userId },
        include: { book: true },
        orderBy: { lastOpenedAt: 'desc' },
        take: 10,
      }),
      prisma.purchase.findMany({
        where: { userId, status: 'COMPLETED' },
        include: { book: true },
        orderBy: { purchasedAt: 'desc' },
      }),
      require('./membershipService').getActiveMembership(userId),
    ]);

  return {
    totalBooksStarted: totalStarted,
    totalBooksCompleted: totalCompleted,
    currentlyReading,
    recentlyRead,
    purchasedBooks,
    membership,
  };
}

module.exports = {
  upsertProgress,
  getProgressForBook,
  touchOpened,
  getContinueReading,
  getReadingHistory,
  getDashboard,
  recordActivity,
  addReadingMinutes,
};
