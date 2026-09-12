const { PrismaClient } = require('@prisma/client');
const env = require('./env');

// Single shared Prisma instance across the app (avoids exhausting DB connections
// via multiple clients, especially important with hot-reload in dev).
const prisma = new PrismaClient({
  log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
