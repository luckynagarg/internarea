/**
 * Async handler wrapper for Express routes.
 *
 * Express does not automatically catch rejected Promises in async handlers.
 * This wrapper ensures any thrown error is forwarded to the centralized
 * error middleware.
 */
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};


