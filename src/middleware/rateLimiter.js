const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// General API limiter
const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMin * 60 * 1000,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  // Session refresh runs on every page load, so it must not eat into the
  // general quota.
  skip: (req) => req.originalUrl.split('?')[0].endsWith('/auth/refresh'),
  message: { success: false, message: 'Too many requests, please try again later' },
});

// Stricter limiter for auth endpoints (login, register, password reset) to
// slow down brute-force / credential-stuffing attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

module.exports = { apiLimiter, authLimiter };
