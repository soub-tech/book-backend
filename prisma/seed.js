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

  // Prices match the frontend's displayed Plus plan (src/data/catalog.ts
  // PLANS) — the original 9.99/89.99 placeholder values were low enough that
  // Stripe rejects them as "amount too small" once converted for settlement.
  const existingMonthly = await prisma.membershipPlan.findFirst({ where: { name: 'Monthly Membership' } });
  if (existingMonthly) {
    await prisma.membershipPlan.update({ where: { id: existingMonthly.id }, data: { price: 299 } });
  } else {
    await prisma.membershipPlan.create({
      data: {
        name: 'Monthly Membership',
        description: 'Unlimited access to all membership books',
        price: 299,
        durationDays: 30,
      },
    });
  }

  const existingAnnual = await prisma.membershipPlan.findFirst({ where: { name: 'Annual Membership' } });
  if (existingAnnual) {
    await prisma.membershipPlan.update({ where: { id: existingAnnual.id }, data: { price: 2990 } });
  } else {
    await prisma.membershipPlan.create({
      data: {
        name: 'Annual Membership',
        description: 'Unlimited access to all membership books, billed yearly',
        price: 2990,
        durationDays: 365,
      },
    });
  }

  // Real catalogue, matching the frontend's src/data/catalog.ts exactly by
  // slug so purchases, progress, and access checks all resolve correctly.
  // access mapping: free -> FREE, paid -> PAID, plus/premium -> MEMBERSHIP
  // (the backend has one membership tier; Plus vs Premium is a frontend-only
  // display distinction for now).
  const books = [
    { slug: 'the-quiet-advantage', title: 'The Quiet Advantage', author: 'Meera Raghavan', accessType: 'MEMBERSHIP', price: 349, category: 'Habits', pageCount: 264 },
    { slug: 'deep-attention', title: 'Deep Attention', author: 'Tomás Reyes', accessType: 'PAID', price: 399, category: 'Productivity', pageCount: 288 },
    { slug: 'money-with-intention', title: 'Money with Intention', author: 'Arjun Mehta', accessType: 'PAID', price: 449, category: 'Finance', pageCount: 312 },
    { slug: 'the-examined-morning', title: 'The Examined Morning', author: 'Elena Varga', accessType: 'FREE', price: 0, category: 'Philosophy', pageCount: 168 },
    { slug: 'leading-without-noise', title: 'Leading Without Noise', author: 'Daniel Okafor', accessType: 'MEMBERSHIP', price: 499, category: 'Business', pageCount: 296 },
    { slug: 'the-inner-voice', title: 'The Inner Voice', author: 'Sophie Lindqvist', accessType: 'MEMBERSHIP', price: 379, category: 'Psychology', pageCount: 240 },
    { slug: 'the-honest-conversation', title: 'The Honest Conversation', author: 'Sophie Lindqvist', accessType: 'MEMBERSHIP', price: 329, category: 'Relationships', pageCount: 208 },
    { slug: 'your-next-chapter', title: 'Your Next Chapter', author: 'Priya Nair', accessType: 'PAID', price: 399, category: 'Career Growth', pageCount: 256 },
    { slug: 'the-patient-builder', title: 'The Patient Builder', author: 'James Whitfield', accessType: 'MEMBERSHIP', price: 429, category: 'Biography', pageCount: 344 },
    { slug: 'small-systems', title: 'Small Systems', author: 'Tomás Reyes', accessType: 'FREE', price: 0, category: 'Productivity', pageCount: 142 },
    { slug: 'worth-more', title: 'Worth More', author: 'Meera Raghavan', accessType: 'MEMBERSHIP', price: 349, category: 'Self-Improvement', pageCount: 224 },
    { slug: 'the-long-game-of-wealth', title: 'The Long Game of Wealth', author: 'Arjun Mehta', accessType: 'MEMBERSHIP', price: 499, category: 'Finance', pageCount: 328 },
    { slug: 'attention-and-meaning', title: 'Attention and Meaning', author: 'Elena Varga', accessType: 'MEMBERSHIP', price: 379, category: 'Philosophy', pageCount: 236 },
    { slug: 'first-ninety-days-of-management', title: 'The First Ninety Days of Management', author: 'Daniel Okafor', accessType: 'PAID', price: 349, category: 'Career Growth', pageCount: 212 },
    { slug: 'the-generous-relationship', title: 'The Generous Relationship', author: 'Sophie Lindqvist', accessType: 'FREE', price: 0, category: 'Relationships', pageCount: 156 },
    { slug: 'the-disciplined-mind', title: 'The Disciplined Mind', author: 'Meera Raghavan', accessType: 'PAID', price: 399, category: 'Psychology', pageCount: 272 },
    { slug: 'a-life-in-letters', title: 'A Life in Letters', author: 'James Whitfield', accessType: 'FREE', price: 0, category: 'Biography', pageCount: 198 },
    { slug: 'the-clear-desk', title: 'The Clear Desk', author: 'Tomás Reyes', accessType: 'MEMBERSHIP', price: 329, category: 'Productivity', pageCount: 196 },
    { slug: 'negotiate-like-you-belong', title: 'Negotiate Like You Belong', author: 'Priya Nair', accessType: 'PAID', price: 299, category: 'Career Growth', pageCount: 184 },
    { slug: 'the-founders-notebook', title: "The Founder's Notebook", author: 'Daniel Okafor', accessType: 'PAID', price: 449, category: 'Business', pageCount: 260 },
    { slug: 'on-friendship', title: 'On Friendship', author: 'Elena Varga', accessType: 'MEMBERSHIP', price: 249, category: 'Philosophy', pageCount: 132 },
    { slug: 'unhurried', title: 'Unhurried', author: 'Tomás Reyes', accessType: 'MEMBERSHIP', price: 379, category: 'Self-Improvement', pageCount: 228 },
    { slug: 'the-first-salary', title: 'The First Salary', author: 'Arjun Mehta', accessType: 'FREE', price: 0, category: 'Finance', pageCount: 120 },
    { slug: 'the-teachers-teacher', title: "The Teacher's Teacher", author: 'James Whitfield', accessType: 'MEMBERSHIP', price: 379, category: 'Biography', pageCount: 302 },
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
