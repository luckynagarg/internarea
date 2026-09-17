/**
 * Centralized Express error handler.
 *
 * All route/service errors should end up here.
 * The goal is to provide consistent JSON error responses and avoid
 * leaking internal details to clients.
 */
const { HttpError } = require('../utils/httpErrors');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Prefer explicit statusCode; fall back to HttpError; otherwise default to 500.
  const statusCode = err.statusCode || (err instanceof HttpError ? err.statusCode : 500);

  // Prefer publicMessage (safe for clients) over internal err.message.
  const message = err.publicMessage || err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
}

module.exports = { errorHandler };


