const { z } = require('zod');

const auth = {
  register: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(128),
  }),
  login: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
  forgotPassword: z.object({
    email: z.string().email(),
  }),
  resetPassword: z.object({
    token: z.string().min(10),
    newPassword: z.string().min(8).max(128),
  }),
  refresh: z.object({
    refreshToken: z.string().min(10).optional(), // may also come from httpOnly cookie
  }),
};

const book = {
  create: z.object({
    title: z.string().min(1).max(300),
    author: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    category: z.string().max(100).optional(),
    price: z.coerce.number().min(0).default(0),
    accessType: z.enum(['FREE', 'PAID', 'MEMBERSHIP']),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    publicationDate: z.coerce.date().optional(),
    pageCount: z.coerce.number().int().min(1).optional(),
  }),
  update: z.object({
    title: z.string().min(1).max(300).optional(),
    author: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    category: z.string().max(100).optional(),
    price: z.coerce.number().min(0).optional(),
    accessType: z.enum(['FREE', 'PAID', 'MEMBERSHIP']).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    publicationDate: z.coerce.date().optional(),
    pageCount: z.coerce.number().int().min(1).optional(),
  }),
  idParam: z.object({ id: z.string().uuid() }),
  list: z.object({
    category: z.string().optional(),
    accessType: z.enum(['FREE', 'PAID', 'MEMBERSHIP']).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

const purchase = {
  create: z.object({
    bookId: z.string().uuid(),
    paymentIntentId: z.string().min(1),
  }),
  checkout: z.object({
    paymentIntentId: z.string().min(1),
    bookIds: z.array(z.string().uuid()).min(1),
  }),
};

const membershipPlan = {
  create: z.object({
    name: z.string().min(1).max(150),
    description: z.string().max(1000).optional(),
    price: z.coerce.number().min(0),
    durationDays: z.coerce.number().int().min(1),
  }),
  update: z.object({
    name: z.string().min(1).max(150).optional(),
    description: z.string().max(1000).optional(),
    price: z.coerce.number().min(0).optional(),
    durationDays: z.coerce.number().int().min(1).optional(),
    isActive: z.coerce.boolean().optional(),
  }),
};

const membership = {
  subscribe: z.object({
    planId: z.string().uuid(),
    paymentIntentId: z.string().min(1),
  }),
};

const progress = {
  update: z.object({
    bookId: z.string().uuid(),
    currentPage: z.coerce.number().int().min(0).optional(),
    percentComplete: z.coerce.number().min(0).max(100),
    lastPosition: z.string().max(500).optional(),
  }),
  bookIdParam: z.object({ bookId: z.string().uuid() }),
};

const user = {
  updateProfile: z.object({
    name: z.string().min(2).max(100).optional(),
  }),
  idParam: z.object({ id: z.string().uuid() }),
};

// slug is optional on create — if omitted, the service auto-generates one
// from name/title. Pass it explicitly only if you want a specific URL.
const author = {
  create: z.object({
    name: z.string().min(1).max(200),
    slug: z.string().min(1).max(200).optional(),
    role: z.string().max(150).optional(),
    bio: z.string().max(3000).optional(),
  }),
  update: z.object({
    name: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(200).optional(),
    role: z.string().max(150).optional(),
    bio: z.string().max(3000).optional(),
  }),
  idParam: z.object({ id: z.string().uuid() }),
  slugParam: z.object({ slug: z.string().min(1) }),
};

const collection = {
  create: z.object({
    title: z.string().min(1).max(200),
    slug: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
  }),
  update: z.object({
    title: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
  }),
  addBook: z.object({ bookId: z.string().uuid() }),
  idParam: z.object({ id: z.string().uuid() }),
  bookIdParam: z.object({ id: z.string().uuid(), bookId: z.string().uuid() }),
  slugParam: z.object({ slug: z.string().min(1) }),
};

// Public contact form — no auth required, so this is the only guard against
// bad input. subject defaults to "other" if the dropdown somehow doesn't
// send a value.
const contact = {
  send: z.object({
    name: z.string().min(1).max(150),
    email: z.string().email(),
    subject: z.enum(['order', 'membership', 'reading', 'rights', 'other']).default('other'),
    message: z.string().min(1).max(5000),
  }),
};

module.exports = { auth, book, purchase, membershipPlan, membership, progress, user, author, collection, contact };
