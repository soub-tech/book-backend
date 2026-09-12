const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateResetToken,
  hashToken,
} = require('../utils/tokens');
const env = require('../config/env');
const { sanitizeUser } = require('../utils/sanitize');

const SALT_ROUNDS = 12;

async function register({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  const tokens = await issueTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Same error for "no such user" and "wrong password" — avoids leaking
  // which emails are registered.
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid email or password');

  const tokens = await issueTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
}

async function issueTokenPair(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // Refresh tokens are stored (hashed) so they can be revoked individually
  // (multi-device logout, password-change invalidation, etc.), unlike a bare
  // stateless JWT which can't be revoked before it expires.
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: { token: hashToken(refreshToken), userId: user.id, expiresAt },
  });

  return { accessToken, refreshToken };
}

async function refreshAccessToken(refreshToken) {
  if (!refreshToken) throw ApiError.unauthorized('Refresh token required');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: hashToken(refreshToken) },
  });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token is no longer valid');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Account no longer active');

  const accessToken = signAccessToken(user);
  return { accessToken };
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  await prisma.refreshToken.updateMany({
    where: { token: hashToken(refreshToken) },
    data: { revoked: true },
  });
}

async function logoutAllDevices(userId) {
  await prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
}

async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always resolve successfully regardless of whether the email exists,
  // so the endpoint can't be used to enumerate registered accounts.
  if (!user) return { rawToken: null };

  const { rawToken, hashedToken } = generateResetToken();
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + env.resetTokenExpiresMin);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: hashedToken, passwordResetExpires: expires },
  });

  return { rawToken, user };
}

async function resetPassword(token, newPassword) {
  const hashed = hashToken(token);
  const user = await prisma.user.findFirst({
    where: { passwordResetToken: hashed, passwordResetExpires: { gt: new Date() } },
  });
  if (!user) throw ApiError.badRequest('Reset token is invalid or has expired');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordResetToken: null, passwordResetExpires: null },
  });

  // Invalidate all existing sessions after a password reset.
  await logoutAllDevices(user.id);
}

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  logoutAllDevices,
  forgotPassword,
  resetPassword,
};
