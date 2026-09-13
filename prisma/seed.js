const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Platform Admin',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const userPasswordHash = await bcrypt.hash('Reader@12345', 12);
  await prisma.user.upsert({
    where: { email: 'reader@example.com' },
    update: {},
    create: {
      name: 'Sample Reader',
      email: 'reader@example.com',
      passwordHash: userPasswordHash,
      role: 'USER',
    },
  });

  // One-time cleanup: earlier seed runs created plans with hardcoded,
  // non-UUID ids ("seed-monthly-plan"/"seed-annual-plan"), which the API
  // rejects as invalid. Remove those so they get recreated correctly below.
  await prisma.membershipPlan.deleteMany({
    where: { id: { in: ['seed-monthly-plan', 'seed-annual-plan'] } },
  });

  const existingMonthly = await prisma.membershipPlan.findFirst({ where: { name: 'Monthly Membership' } });
  if (!existingMonthly) {
    await prisma.membershipPlan.create({
      data: {
        name: 'Monthly Membership',
        description: 'Unlimited access to all membership books',
        price: 9.99,
        durationDays: 30,
      },
    });
  }

  const existingAnnual = await prisma.membershipPlan.findFirst({ where: { name: 'Annual Membership' } });
  if (!existingAnnual) {
    await prisma.membershipPlan.create({
      data: {
        name: 'Annual Membership',
        description: 'Unlimited access to all membership books, billed yearly',
        price: 89.99,
        durationDays: 365,
      },
    });
  }

  const books = [
    { slug: 'the-open-road', title: 'The Open Road', author: 'J. Marlowe', accessType: 'FREE', price: 0, category: 'Fiction' },
    { slug: 'deep-work-principles', title: 'Deep Work Principles', author: 'A. Newport-Fan', accessType: 'PAID', price: 12.99, category: 'Productivity' },
    { slug: 'mystery-of-the-vault', title: 'Mystery of the Vault', author: 'C. Hale', accessType: 'MEMBERSHIP', price: 0, category: 'Mystery' },
  ];

  for (const b of books) {
    const existing = await prisma.book.findFirst({ where: { slug: b.slug } });
    if (!existing) {
      await prisma.book.create({ data: b });
    }
  }

  console.log('Seed complete. Admin login: admin@example.com / Admin@12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
