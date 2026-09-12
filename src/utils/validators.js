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
    paymentRef: z.string().max(200).optional(),
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
    paymentRef: z.string().max(200).optional(),
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

module.exports = { auth, book, purchase, membershipPlan, membership, progress, user };
