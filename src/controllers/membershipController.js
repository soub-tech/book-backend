const catchAsync = require('../utils/catchAsync');
const prisma = require('../config/db');
const membershipService = require('../services/membershipService');
const ApiError = require('../utils/ApiError');

// --- Plans (public read, admin write) ---

const listPlans = catchAsync(async (req, res) => {
  const plans = await prisma.membershipPlan.findMany({ where: { isActive: true } });
  res.json({ success: true, data: plans });
});

const createPlan = catchAsync(async (req, res) => {
  const plan = await prisma.membershipPlan.create({ data: req.body });
  res.status(201).json({ success: true, data: plan });
});

const updatePlan = catchAsync(async (req, res) => {
  const plan = await prisma.membershipPlan.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: plan });
});

const deletePlan = catchAsync(async (req, res) => {
  await prisma.membershipPlan.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true, message: 'Plan deactivated' });
});

// --- User subscriptions ---

const subscribe = catchAsync(async (req, res) => {
  const membership = await membershipService.subscribe(req.user.id, req.body);
  res.status(201).json({ success: true, data: membership });
});

const cancelMyMembership = catchAsync(async (req, res) => {
  const membership = await membershipService.cancel(req.user.id, req.params.id);
  res.json({ success: true, data: membership });
});

const getMyStatus = catchAsync(async (req, res) => {
  const membership = await membershipService.getActiveMembership(req.user.id);
  res.json({ success: true, data: { active: Boolean(membership), membership } });
});

const getMyHistory = catchAsync(async (req, res) => {
  const history = await membershipService.getHistory(req.user.id);
  res.json({ success: true, data: history });
});

// --- Admin ---

const listAllMemberships = catchAsync(async (req, res) => {
  const memberships = await prisma.membership.findMany({
    include: { plan: true, user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: memberships });
});

module.exports = {
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  subscribe,
  cancelMyMembership,
  getMyStatus,
  getMyHistory,
  listAllMemberships,
};
