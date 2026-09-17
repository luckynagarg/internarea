/**
 * Firebase Authentication middleware.
 *
 * This verifies the Firebase ID token sent by the frontend and attaches
 * a trusted user identity to req.user.
 *
 * Security goal:
 * Never trust user identity from req.body; always derive userId from
 * verified tokens.
 */
const asyncHandler = require('./../middleware/asyncHandler');
const { getAdminOrThrow } = require('./../config/firebaseAdmin');

const { unauthorized, serviceUnavailable } = require('./../utils/httpErrors');

/**
 * Express middleware that verifies Firebase ID tokens.
 *
 * Expected header:
 *   Authorization: Bearer <firebaseIdToken>
 */
const verifyFirebaseIdToken = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  // Only log whether a header/token is present (never the token itself) and do it at
  // debug level to avoid noisy production logs.
  const hasBearer = !!header && header.startsWith('Bearer ');

  if (!hasBearer) {
    // A missing/invalid header is a client error, not server error.
    throw unauthorized(
      'Missing Authorization header or invalid format (expected: Bearer <token>).'
    );
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) throw unauthorized('Missing Firebase ID token (after Bearer).');

  // Decode & verify the token signature.
  // This is the critical step that guarantees req.user.uid is authentic.
  // Ensure firebase-admin is initialized when this middleware is actually used.
  let admin;
  try {
    admin = getAdminOrThrow();
  } catch (e) {
    // Firebase Admin credentials missing/malformed on the deployment.
    // Include the root cause (never secrets) so the 503 is actionable.
    const reason = (e && e.message) || 'unknown reason';
    console.error('[authFirebase] Firebase Admin not initialized:', reason);
    throw serviceUnavailable(
      `Authentication service is not configured. Reason: ${reason}. Contact the administrator.`
    );
  }

  // firebase-admin v14: use getAuth() from the auth subpath to verify tokens.
  // admin.auth() is not available in v14; the auth service is registered via
  // require('firebase-admin/auth') in config/firebaseAdmin.js.
  let decoded;
  let authService;
  try {
    const { getAuth } = require('firebase-admin/auth');
    authService = getAuth();
  } catch (e) {
    console.error('[authFirebase] Failed to load firebase-admin/auth:', e.message);
    throw serviceUnavailable('Authentication service is not configured. Contact the administrator.');
  }

  try {
    decoded = await authService.verifyIdToken(token);
  } catch (e) {
    const code = e && e.code ? e.code : null;
    // Log at error level without the full token.
    console.warn('[authFirebase] verifyIdToken failed:', code || 'unknown');
    // Return a generic error to avoid leaking internal details.
    throw unauthorized('Authentication failed: invalid or expired token.');
  }

  if (!decoded || !decoded.uid) {
    throw unauthorized('Invalid Firebase token: missing uid/claims.');
  }

  // Attach a minimal, trusted identity object for downstream handlers.
  // Include admin-ish flags if present in custom claims.
  req.user = {
    sessionKey: `${decoded.uid}:${decoded.auth_time}`,
    uid: decoded.uid,
    email: decoded.email || null,
    name: decoded.name || null,
    claims: decoded,
    isAdmin:
      decoded?.admin === true ||
      decoded?.isAdmin === true ||
      decoded?.role === "admin",
    admin: decoded?.admin === true,
  };

  // Login bootstrap endpoints verify Firebase credentials but cannot require
  // the grant they establish. All other private API handlers fail closed.
  const gatePaths = new Set([
    '/api/login/start', '/api/login/verify-otp', '/api/login/resend-otp',
    '/api/login/session-status', '/api/login/logout', '/api/profile/bootstrap',
  ]);
  const requestPath = req.originalUrl.split('?')[0].replace(/\/$/, '');
  if (!gatePaths.has(requestPath) && !req.user.isAdmin) {
    const { getLoginAccessState } = require('../services/loginSecurityService');
    const state = await getLoginAccessState({ userId: req.user.uid, sessionKey: req.user.sessionKey });
    if (!state.verified) {
      return res.status(403).json({ success: false, code: 'LOGIN_VERIFICATION_REQUIRED',
        message: 'Complete login security verification before accessing this resource.' });
    }
  }
  return next();
});

module.exports = { verifyFirebaseIdToken };
