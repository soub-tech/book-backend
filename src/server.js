const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/db');
const membershipService = require('./services/membershipService');
const bestsellerJob = require('./jobs/updateBestsellers');

const server = app.listen(env.port, () => {
  console.log(`API listening on port ${env.port} [${env.nodeEnv}]`);
});

// Periodically flip expired memberships from ACTIVE to EXPIRED so access
// checks that only look at `status` (e.g. admin listings) stay accurate.
// (userHasAccess itself also checks expiryDate directly, so this is a
// consistency sweep, not the sole enforcement point.)
const EXPIRY_SWEEP_INTERVAL_MS = 60 * 60 * 1000; // hourly
setInterval(() => {
  membershipService.expireStaleMemberships().catch((err) => {
    console.error('Membership expiry sweep failed:', err);
  });
}, EXPIRY_SWEEP_INTERVAL_MS);

// Recomputes bestseller and new-book flags from real purchase/reading data.
// Runs once on boot (so flags aren't stale after a deploy) and then hourly.
const BESTSELLER_SWEEP_INTERVAL_MS = 60 * 60 * 1000; // hourly
bestsellerJob.runAll().catch((err) => {
  console.error('Bestseller/new-book sweep failed on startup:', err);
});
setInterval(() => {
  bestsellerJob.runAll().catch((err) => {
    console.error('Bestseller/new-book sweep failed:', err);
  });
}, BESTSELLER_SWEEP_INTERVAL_MS);

async function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
