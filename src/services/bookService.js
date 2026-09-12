const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const membershipService = require('./membershipService');

async function listBooks({ category, accessType, search, page, limit }, { includeUnpublished = false } = {}) {
  const where = {
    ...(includeUnpublished ? {} : { status: 'PUBLISHED' }),
    ...(category ? { category } : {}),
    ...(accessType ? { accessType } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { author: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.book.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.book.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getBookById(id) {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) throw ApiError.notFound('Book not found');
  return book;
}

async function getBookBySlug(slug) {
  const book = await prisma.book.findUnique({ where: { slug } });
  if (!book) throw ApiError.notFound('Book not found');
  return book;
}

async function createBook(data) {
  return prisma.book.create({ data });
}

async function updateBook(id, data) {
  await getBookById(id); // 404 if missing
  return prisma.book.update({ where: { id }, data });
}

async function deleteBook(id) {
  await getBookById(id);
  return prisma.book.delete({ where: { id } });
}

async function setCoverImage(id, coverImageUrl) {
  await getBookById(id);
  return prisma.book.update({ where: { id }, data: { coverImageUrl } });
}

async function setBookFile(id, fileUrl) {
  await getBookById(id);
  return prisma.book.update({ where: { id }, data: { fileUrl } });
}

// THE security-critical check: does this user have the right to read this
// book's actual content right now? Every route that serves book content or
// reading progress must go through this — never infer access from the
// frontend's request.
async function userHasAccess(userId, book) {
  if (book.accessType === 'FREE') return true;

  if (book.accessType === 'MEMBERSHIP') {
    return membershipService.isMembershipActive(userId);
  }

  if (book.accessType === 'PAID') {
    const purchase = await prisma.purchase.findUnique({
      where: { userId_bookId: { userId, bookId: book.id } },
    });
    return Boolean(purchase && purchase.status === 'COMPLETED');
  }

  return false;
}

async function assertAccess(userId, bookId) {
  const book = await getBookById(bookId);
  const allowed = await userHasAccess(userId, book);
  if (!allowed) {
    throw ApiError.forbidden('You do not have access to this book. Purchase it or subscribe to a membership.');
  }
  return book;
}

async function getBookStats(bookId) {
  const [startedCount, completedCount] = await Promise.all([
    prisma.readingProgress.count({ where: { bookId } }),
    prisma.readingProgress.count({ where: { bookId, isCompleted: true } }),
  ]);
  return { startedCount, completedCount };
}

module.exports = {
  listBooks,
  getBookById,
  getBookBySlug,
  createBook,
  updateBook,
  deleteBook,
  setCoverImage,
  setBookFile,
  userHasAccess,
  assertAccess,
  getBookStats,
};
