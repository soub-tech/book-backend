const prisma = require('../config/db');
const bookService = require('./bookService');

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
  });
}

async function getProgressForBook(userId, bookId) {
  return prisma.readingProgress.findUnique({ where: { userId_bookId: { userId, bookId } } });
}

// Marks a book as "opened" without changing progress — used by the reader
// when the user opens a book to update lastOpenedAt / create an initial row.
async function touchOpened(userId, bookId) {
  return prisma.readingProgress.upsert({
    where: { userId_bookId: { userId, bookId } },
    update: { lastOpenedAt: new Date() },
    create: { userId, bookId, lastOpenedAt: new Date() },
  });
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
};
