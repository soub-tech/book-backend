const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const paymentService = require('./paymentService');

// Central source of truth for "is this user's membership active right now".
// Never trust a stored ACTIVE status alone — always check the expiry date,
// since a background job or manual admin update could be delayed.
async function getActiveMembership(userId) {
  const membership = await prisma.membership.findFirst({
    where: { userId, status: 'ACTIVE', expiryDate: { gt: new Date() } },
    include: { plan: true },
    orderBy: { expiryDate: 'desc' },
  });
  return membership || null;
}

async function isMembershipActive(userId) {
  const membership = await getActiveMembership(userId);
  return Boolean(membership);
}

async function subscribe(userId, { planId, paymentRef: clientPaymentRef }) {
  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) throw ApiError.notFound('Membership plan not found');

  const payment = await paymentService.processPayment({
    amountRupees: Number(plan.price),
    description: `Membership: ${plan.name}`,
    metadata: { userId, planId },
  });
  if (!payment.success) {
    throw ApiError.badRequest('Payment could not be completed');
  }

  const existing = await getActiveMembership(userId);
  const startDate = existing ? existing.expiryDate : new Date();
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

  // If there's an existing active membership, extend it rather than
  // stacking two simultaneous "ACTIVE" rows.
  if (existing) {
    await prisma.membership.update({
      where: { id: existing.id },
      data: { expiryDate },
    });
  }

  return prisma.membership.create({
    data: {
      userId,
      planId,
      startDate: new Date(),
      expiryDate,
      status: 'ACTIVE',
    },
    include: { plan: true },
  });
}

async function cancel(userId, membershipId) {
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, userId },
  });
  if (!membership) throw ApiError.notFound('Membership not found');

  return prisma.membership.update({
    where: { id: membershipId },
    data: { status: 'CANCELLED' },
  });
}

async function getHistory(userId) {
  return prisma.membership.findMany({
    where: { userId },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });
}

// Sweeps memberships whose expiryDate has passed but are still marked ACTIVE.
// Intended to be run on a schedule (cron) so membership-only access checks
// stay correct even without a request happening at the exact expiry moment.
async function expireStaleMemberships() {
  const result = await prisma.membership.updateMany({
    where: { status: 'ACTIVE', expiryDate: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });
  return result.count;
}

module.exports = {
  getActiveMembership,
  isMembershipActive,
  subscribe,
  cancel,
  getHistory,
  expireStaleMemberships,
};
