const crypto = require("crypto");
const { verifyFirebaseIdToken } = require("./authFirebase");
const { forbidden, unauthorized } = require("../utils/httpErrors");

/**
 * Admin session tokens (username/password admin login).
 *
 * The username/password adminlogin flow has no Firebase session, so it is
 * issued a short-lived, server-signed session token (HMAC-SHA256). Admin
 * API routes accept EITHER this session token OR a Firebase ID token with
 * the admin custom claim.
 *
 * Secret resolution:
 *   1. ADMIN_SESSION_SECRET env var (REQUIRED for production)
 *   2. Throws if not configured — no insecure fallback.
 */

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function getAdminUser() {
  const user = process.env.ADMIN_USER;
  if (!user || !user.trim()) {
    throw new Error('[adminSession] ADMIN_USER environment variable is required.');
  }
  return user.trim();
}

function getAdminPass() {
  const pass = process.env.ADMIN_PASS;
  if (!pass || pass.length < 8) {
    throw new Error('[adminSession] ADMIN_PASS must be at least 8 characters.');
  }
  return pass;
}

function getAdminSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('[adminSession] ADMIN_SESSION_SECRET must be at least 32 characters for production security.');
  }
  return secret;
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** Issue a signed admin session token: base64url(payload).base64url(hmac) */
function issueAdminSessionToken() {
  const payload = Buffer.from(
    JSON.stringify({
      sub: getAdminUser(),
      iat: Date.now(),
      exp: Date.now() + SESSION_TTL_MS,
    })
  ).toString("base64url");

  const sig = crypto
    .createHmac("sha256", getAdminSessionSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${sig}`;
}

/**
 * Parse + verify a bearer token as an admin session token.
 * Returns the payload if valid, otherwise null.
 */
function verifyAdminSessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  // Firebase JWTs have 3 segments; session tokens have exactly 2.
  if (parts.length !== 2) return null;

  const [payload, sig] = parts;
  let expected;
  try {
    expected = crypto
      .createHmac("sha256", getAdminSessionSecret())
      .update(payload)
      .digest("base64url");
  } catch {
    return null;
  }
  if (!safeEqual(sig, expected)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data || typeof data.exp !== "number" || Date.now() > data.exp) {
      return null; // expired
    }
    if (data.sub !== getAdminUser()) return null;
    return data;
  } catch {
    return null;
  }
}

function readBearerToken(req) {
  const h = req.headers?.authorization || "";
  if (typeof h === "string" && h.startsWith("Bearer ")) {
    return h.slice(7).trim();
  }
  return null;
}

/**
 * requireAdminAccess
 *
 * Unified guard for all /api/admin/* data routes:
 *   1. Valid admin session token (username/password login)  → allow
 *   2. Firebase ID token with admin custom claim            → allow
 *   3. Anything else                                        → 401/403
 */
const requireAdminAccess = (req, res, next) => {
  const token = readBearerToken(req);

  if (token) {
    const parts = token.split(".");
    if (parts.length === 2) {
      // Looks like one of OUR session tokens — verify it strictly.
      const session = verifyAdminSessionToken(token);
      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Admin session expired or invalid. Please sign in again.",
        });
      }
      req.user = {
        uid: "admin",
        email: null,
        isAdmin: true,
        via: "admin-session",
      };
      return next();
    }
    // 3-segment token → treat as Firebase ID token.
    return verifyFirebaseIdToken(req, res, () =>
      requireAdminExisting(req, res, next)
    );
  }

  // No Authorization header — fall back to the Firebase chain (which will
  // produce the standard 401 for unauthenticated callers).
  return verifyFirebaseIdToken(req, res, () =>
    requireAdminExisting(req, res, next)
  );
};

// Lazy import to avoid a require cycle at module load.
function requireAdminExisting(req, res, next) {
  const { requireAdmin } = require("./requireAdmin");
  return requireAdmin(req, res, next);
}

module.exports = {
  SESSION_TTL_MS,
  issueAdminSessionToken,
  verifyAdminSessionToken,
  requireAdminAccess,
};
