const rateLimit = require('express-rate-limit');

module.exports = function buildRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

