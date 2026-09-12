const catchAsync = require('../utils/catchAsync');
const prisma = require('../config/db');
const { sanitizeUser } = require('../utils/sanitize');
const progressService = require('../services/progressService');
const membershipService = require('../services/membershipService');
const ApiError = require('../utils/ApiError');

const getMe = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, data: sanitizeUser(user) });
});

const updateMe = catchAsync(async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: req.body, // validated: only `name` is allowed through
  });
  res.json({ success: true, data: sanitizeUser(user) });
});

const getDashboard = catchAsync(async (req, res) => {
  const dashboard = await progressService.getDashboard(req.user.id);
  const isMember = await membershipService.isMembershipActive(req.user.id);
  res.json({ success: true, data: { ...dashboard, membershipActive: isMember } });
});

module.exports = { getMe, updateMe, getDashboard };
