const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const bookService = require('./bookService');
const paymentService = require('./paymentService');
const emailService = require('./emailService');

// Single-book purchase, used when a real payment has already been verified
// (paymentIntentId) — kept for API compatibility with any single-item flow.
async function purchaseBook(userId, { bookId, paymentIntentId }) {
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

  const verification = await paymentService.verifyPayment(paymentIntentId);
  if (!verification.success) {
    throw ApiError.badRequest('Payment could not be verified');
  }

  const purchase = await prisma.purchase.upsert({
    where: { userId_bookId: { userId, bookId } },
    update: { status: 'COMPLETED', amount: book.price, paymentRef: verification.paymentRef, purchasedAt: new Date() },
    create: { userId, bookId, amount: book.price, status: 'COMPLETED', paymentRef: verification.paymentRef },
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user) {
    emailService.sendPurchaseConfirmationEmail(user.email, { bookTitle: book.title, amount: book.price }).catch(() => {});
  }

  return purchase;
}

// Whole-cart checkout: ONE payment intent covers every item, verified once,
// then a purchase row is created per book. This matches how checkout
// actually charges the customer (a single total), rather than one charge per
// book.
async function checkoutCart(userId, { paymentIntentId, bookIds }) {
  const verification = await paymentService.verifyPayment(paymentIntentId);
  if (!verification.success) {
    throw ApiError.badRequest('Payment could not be verified');
  }

  const purchases = [];
  for (const bookId of bookIds) {
    const book = await bookService.getBookById(bookId);
    if (book.accessType === 'FREE') continue; // free books need no purchase record

    const existing = await prisma.purchase.findUnique({ where: { userId_bookId: { userId, bookId } } });
    if (existing && existing.status === 'COMPLETED') continue; // already owned, skip silently rather than failing the whole checkout

    const purchase = await prisma.purchase.upsert({
      where: { userId_bookId: { userId, bookId } },
      update: { status: 'COMPLETED', amount: book.price, paymentRef: verification.paymentRef, purchasedAt: new Date() },
      create: { userId, bookId, amount: book.price, status: 'COMPLETED', paymentRef: verification.paymentRef },
    });
    purchases.push(purchase);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user) {
      emailService.sendPurchaseConfirmationEmail(user.email, { bookTitle: book.title, amount: book.price }).catch(() => {});
    }
  }

  return purchases;
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

module.exports = { purchaseBook, checkoutCart, getUserPurchases, getAllPurchases };
