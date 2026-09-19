const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const bookService = require('./bookService');
const paymentService = require('./paymentService');

async function purchaseBook(userId, { bookId, paymentRef: clientPaymentRef }) {
  const book = await bookService.getBookById(bookId);

  if (book.accessType === 'FREE') {
    throw ApiError.badRequest('This book is free and does not require purchase');
  }

  const existing = await prisma.purchase.findUnique({
    where: { userId_bookId: { userId, bookId } },
  });
  if (existing && existing.status === 'COMPLETED') {
    throw ApiError.conflict('You already own this book');
  }

  // Runs the actual charge (or, currently, the simulated stand-in — see
  // paymentService.js). The purchase is only marked COMPLETED if this
  // succeeds, so nothing downstream needs to know whether a real gateway or
  // the simulation produced the result.
  const payment = await paymentService.processPayment({
    amountRupees: Number(book.price),
    description: `Purchase: ${book.title}`,
    metadata: { userId, bookId },
  });
  if (!payment.success) {
    throw ApiError.badRequest('Payment could not be completed');
  }

  const purchase = await prisma.purchase.upsert({
    where: { userId_bookId: { userId, bookId } },
    update: { status: 'COMPLETED', amount: book.price, paymentRef: clientPaymentRef || payment.paymentRef, purchasedAt: new Date() },
    create: { userId, bookId, amount: book.price, status: 'COMPLETED', paymentRef: clientPaymentRef || payment.paymentRef },
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
