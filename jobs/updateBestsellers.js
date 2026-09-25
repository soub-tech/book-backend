// jobs/updateBestsellers.js
//
// Recomputes which books are "bestsellers" based on real completed
// purchases (and optionally reading activity for free/membership books)
// over a rolling window. Matches your actual schema.prisma field names
// and reuses your shared prisma client from config/db.

const prisma = require('../config/db');

const WINDOW_DAYS = 30;      // sales window to consider
const BESTSELLER_COUNT = 10; // how many books get the badge
const COUNT_READS = true;    // fold in FREE/MEMBERSHIP book reads, not just paid purchases

async function updateBestsellers() {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // 1. Count completed purchases per book in the window
  const purchaseCounts = await prisma.purchase.groupBy({
    by: ['bookId'],
    where: {
      status: 'COMPLETED',
      purchasedAt: { gte: since },
    },
    _count: { bookId: true },
  });

  const salesMap = new Map();
  for (const row of purchaseCounts) {
    salesMap.set(row.bookId, row._count.bookId);
  }

  // 2. Optionally fold in reading activity — covers FREE/MEMBERSHIP books
  //    that never generate a Purchase row.
  if (COUNT_READS) {
    const readCounts = await prisma.readingProgress.groupBy({
      by: ['bookId'],
      where: { lastOpenedAt: { gte: since } },
      _count: { bookId: true },
    });
    for (const row of readCounts) {
      salesMap.set(row.bookId, (salesMap.get(row.bookId) || 0) + row._count.bookId);
    }
  }

  // 3. Rank
  const ranked = [...salesMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, BESTSELLER_COUNT);

  const topIds = ranked.map(([bookId]) => bookId);

  // 4. Reset all, then flag + rank the top N (atomic transaction)
  await prisma.$transaction([
    prisma.book.updateMany({
      data: { isBestseller: false, bestsellerRank: null },
    }),
    ...ranked.map(([bookId], index) =>
      prisma.book.update({
        where: { id: bookId },
        data: { isBestseller: true, bestsellerRank: index + 1 },
      })
    ),
  ]);

  console.log(`[bestsellers] updated ${topIds.length} books at ${new Date().toISOString()}`);
}

// --- "New" flag: pure date logic against publicationDate ---
const NEW_WINDOW_DAYS = 14;

async function updateNewFlags() {
  const cutoff = new Date(Date.now() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.book.updateMany({
      where: { publicationDate: { lt: cutoff } },
      data: { isNew: false },
    }),
    prisma.book.updateMany({
      where: { publicationDate: { gte: cutoff } },
      data: { isNew: true },
    }),
  ]);

  console.log(`[new-flags] updated at ${new Date().toISOString()}`);
}

async function runAll() {
  await updateBestsellers();
  await updateNewFlags();
}

module.exports = { updateBestsellers, updateNewFlags, runAll };
