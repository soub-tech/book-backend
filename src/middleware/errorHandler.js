const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Prisma throws structured errors with a `code` (e.g. P2002 = unique constraint).
function mapPrismaError(err) {
  if (err.code === 'P2002') {
    return ApiError.conflict(`A record with this ${err.meta?.target?.join(', ') || 'value'} already exists`);
  }
  if (err.code === 'P2025') {
    return ApiError.notFound('Record not found');
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Must capture this BEFORE wrapping err in ApiError below — every ApiError
  // (including the generic wrapper) sets isOperational = true by design, so
  // checking it after wrapping would always be true and never log anything.
  const wasUnexpected = !(err instanceof ApiError);

  let error = err;

  if (err.code && err.code.startsWith('P')) {
    error = mapPrismaError(err) || ApiError.internal('Database error');
  }

  if (!(error instanceof ApiError)) {
    error = ApiError.internal(env.nodeEnv === 'development' ? err.message : 'Something went wrong');
  }

  if (wasUnexpected) {
    console.error(err);
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    details: error.details || undefined,
    ...(env.nodeEnv === 'development' ? { stack: err.stack } : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };
