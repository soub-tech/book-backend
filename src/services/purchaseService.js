const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const bookService = require('./bookService');

async function purchaseBook(userId, { bookId, paymentRef }) {
  const book = await bookService.getBookById(bookId);

  if (book.accessType === 'FREE') {
    throw ApiError.badRequest('This book is free and does not require purchase');
  }
  if (book.accessType === 'MEMBERSHIP') {
    throw ApiError.badRequest('This book is available through membership, not individual purchase');
  }

  const existing = await prisma.purchase.findUnique({
    where: { userId_bookId: { userId, bookId } },
  });
  if (existing && existing.status === 'COMPLETED') {
    throw ApiError.conflict('You already own this book');
  }

  // In production this is where a payment gateway (Stripe, etc.) would be
  // charged first; the purchase record is written as COMPLETED only after
  // the charge succeeds. paymentRef stores the gateway's transaction id.
  const purchase = await prisma.purchase.upsert({
    where: { userId_bookId: { userId, bookId } },
    update: { status: 'COMPLETED', amount: book.price, paymentRef, purchasedAt: new Date() },
    create: { userId, bookId, amount: book.price, status: 'COMPLETED', paymentRef },
  });

  return purchase;
}

async function getUserPurchases(userId) {
  return prisma.purchase.findMany({
    where: { userId, status: 'COMPLETED' },
    include: { book: true },
    orderBy: { purchasedAt: 'desc' },
  });
}

async function getAllPurchases({ page = 1, limit = 20 } = {}) {
  const [items, total] = await Promise.all([
    prisma.purchase.findMany({
      include: { book: true, user: { select: { id: true, name: true, email: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { purchasedAt: 'desc' },
    }),
    prisma.purchase.count(),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

module.exports = { purchaseBook, getUserPurchases, getAllPurchases };
