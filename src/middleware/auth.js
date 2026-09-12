const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/tokens');
const prisma = require('../config/db');

// Requires a valid access token. Attaches a minimal, trusted req.user
// ({ id, role }) — never trusts anything from the request body/query for
// identity or role, only the verified token payload.
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) throw ApiError.unauthorized('Authentication required');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      throw ApiError.unauthorized('Invalid or expired token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Account no longer active');
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

// Does not fail if there's no token — useful for endpoints that behave
// differently for logged-in vs anonymous users (e.g. book listing).
async function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user && user.isActive) {
      req.user = { id: user.id, role: user.role };
    }
  } catch (err) {
    // Invalid token on an optional route just means "treat as anonymous".
  }
  next();
}

// Role-based access control. Usage: authorize('ADMIN')
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

module.exports = { authenticate, optionalAuthenticate, authorize };
