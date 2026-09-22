require('dotenv').config();

function required(name, fallback) {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  // Comma-separated list supported, e.g. "https://my-app.lovable.app,https://mydomain.com"
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map((s) => s.trim()),
  // The one canonical frontend URL used to build links in emails (password
  // reset, etc.) — defaults to the first entry in CLIENT_URL if not set.
  appUrl: process.env.APP_URL || (process.env.CLIENT_URL || 'http://localhost:3000').split(',')[0].trim(),
  // Set true when the frontend is on a different domain than this API
  // (e.g. a Lovable-hosted app calling a Render/Railway-hosted backend).
  cookieCrossOrigin: process.env.COOKIE_CROSS_ORIGIN === 'true',

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  resetTokenExpiresMin: Number(process.env.RESET_TOKEN_EXPIRES_MIN || 30),

  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxMb: Number(process.env.MAX_UPLOAD_MB || 50),
  },

  rateLimit: {
    windowMin: Number(process.env.RATE_LIMIT_WINDOW_MIN || 15),
    max: Number(process.env.RATE_LIMIT_MAX || 100),
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || null,
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || null,
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY || null,
    fromAddress: process.env.EMAIL_FROM || 'onboarding@resend.dev',
  },
};
