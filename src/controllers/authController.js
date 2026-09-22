const catchAsync = require('../utils/catchAsync');
const authService = require('../services/authService');
const emailService = require('../services/emailService');
const env = require('../config/env');

const REFRESH_COOKIE_NAME = 'refreshToken';
// Frontend (e.g. a Lovable app) and backend live on different domains, so the
// refresh cookie must be SameSite=None + Secure to be sent cross-site at all.
// Browsers reject SameSite=None without Secure, so this forces HTTPS in that mode.
const crossOrigin = env.cookieCrossOrigin;
const cookieOptions = {
  httpOnly: true,
  secure: crossOrigin || env.nodeEnv === 'production',
  sameSite: crossOrigin ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/api/auth',
};

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, cookieOptions);
}

const register = catchAsync(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body);
  setRefreshCookie(res, refreshToken);
  res.status(201).json({ success: true, data: { user, accessToken } });
});

const login = catchAsync(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  setRefreshCookie(res, refreshToken);
  res.json({ success: true, data: { user, accessToken } });
});

const googleLogin = catchAsync(async (req, res) => {
  const { idToken } = req.body;
  const { user, accessToken, refreshToken } = await authService.loginWithGoogle(idToken);
  setRefreshCookie(res, refreshToken);
  res.json({ success: true, data: { user, accessToken } });
});

// Access tokens live client-side (Authorization header); refresh tokens are
// stored in an httpOnly cookie so JS can't read them (XSS mitigation) while
// still allowing "remember me" style persistence across sessions.
const refresh = catchAsync(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body.refreshToken;
  const { accessToken } = await authService.refreshAccessToken(token);
  res.json({ success: true, data: { accessToken } });
});

const logout = catchAsync(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body.refreshToken;
  await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  res.json({ success: true, message: 'Logged out' });
});

const logoutAll = catchAsync(async (req, res) => {
  await authService.logoutAllDevices(req.user.id);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  res.json({ success: true, message: 'Logged out of all devices' });
});

const forgotPassword = catchAsync(async (req, res) => {
  const { rawToken, user } = await authService.forgotPassword(req.body.email);

  if (rawToken && user) {
    const resetLink = `${env.appUrl}/reset-password?token=${rawToken}`;
    await emailService.sendPasswordResetEmail(user.email, resetLink);
    // Still logged in non-production so the flow is testable without
    // waiting on real email delivery during development.
    if (env.nodeEnv !== 'production') {
      console.log(`Password reset link for ${user.email}: ${resetLink}`);
    }
  }

  res.json({
    success: true,
    message: 'If an account with that email exists, a reset link has been sent',
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword(token, newPassword);
  res.json({ success: true, message: 'Password has been reset. Please log in again.' });
});

module.exports = { register, login, googleLogin, refresh, logout, logoutAll, forgotPassword, resetPassword };
