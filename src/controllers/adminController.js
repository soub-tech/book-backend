const catchAsync = require('../utils/catchAsync');
const prisma = require('../config/db');
const { sanitizeUser } = require('../utils/sanitize');
const ApiError = require('../utils/ApiError');

const listUsers = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        memberships: { where: { status: 'ACTIVE' }, take: 1 },
        _count: { select: { purchases: true, readingProgress: true } },
      },
    }),
    prisma.user.count(),
  ]);

  res.json({
    success: true,
    data: { items: items.map(sanitizeUser), total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

const getUser = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      purchases: { include: { book: true } },
      memberships: { include: { plan: true } },
      readingProgress: { include: { book: true } },
    },
  });
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, data: sanitizeUser(user) });
});

const setUserActive = catchAsync(async (req, res) => {
  const { isActive } = req.body;
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: Boolean(isActive) } });
  res.json({ success: true, data: sanitizeUser(user) });
});

const setUserRole = catchAsync(async (req, res) => {
  const { role } = req.body;
  if (!['USER', 'ADMIN'].includes(role)) throw ApiError.badRequest('role must be USER or ADMIN');
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
  res.json({ success: true, data: sanitizeUser(user) });
});

// Platform-wide reading statistics for the admin dashboard.
const getPlatformStats = catchAsync(async (req, res) => {
  const [totalUsers, totalBooks, totalPurchases, activeMemberships, revenueAgg, topBooks] = await Promise.all([
    prisma.user.count(),
    prisma.book.count(),
    prisma.purchase.count({ where: { status: 'COMPLETED' } }),
    prisma.membership.count({ where: { status: 'ACTIVE', expiryDate: { gt: new Date() } } }),
    prisma.purchase.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
    prisma.readingProgress.groupBy({
      by: ['bookId'],
      _count: { bookId: true },
      orderBy: { _count: { bookId: 'desc' } },
      take: 5,
    }),
  ]);

  const topBookDetails = await prisma.book.findMany({
    where: { id: { in: topBooks.map((t) => t.bookId) } },
  });

  res.json({
    success: true,
    data: {
      totalUsers,
      totalBooks,
      totalPurchases,
      activeMemberships,
      totalRevenue: revenueAgg._sum.amount || 0,
      mostReadBooks: topBooks.map((t) => ({
        book: topBookDetails.find((b) => b.id === t.bookId),
        readerCount: t._count.bookId,
      })),
    },
  });
});

module.exports = { listUsers, getUser, setUserActive, setUserRole, getPlatformStats };
