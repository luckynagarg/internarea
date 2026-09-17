const asyncHandler = require("./asyncHandler");
const { forbidden, unauthorized } = require("../utils/httpErrors");

/**
 * requireAdmin
 * 
 * Expects `req.user` to be populated by verifyFirebaseIdToken middleware.
 * This middleware checks that the token contains an admin claim.
 */
const requireAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) throw unauthorized("Missing authenticated user.");

  // Convention: verifyFirebaseIdToken should attach claims/admin info.
  // Fallback: if claims aren't present, deny by default.
  const isAdmin =
    req.user?.isAdmin === true ||
    req.user?.admin === true ||
    req.user?.claims?.admin === true ||
    req.user?.claims?.isAdmin === true;

  if (!isAdmin) {
    throw forbidden("Admin access required.");
  }

  return next();
});

module.exports = { requireAdmin };

