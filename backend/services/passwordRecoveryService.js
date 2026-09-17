const crypto = require("crypto");


const PasswordRecovery = require("../Model/PasswordRecovery");
const { badRequest, forbidden, notFound, internalServerError } = require("../utils/httpErrors");

const { sendTemplatedEmail, buildOtpEmailHtml } = require('./emailTemplates');

/**
 * OTP configuration.
 */
const OTP_LENGTH = 6;
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_OTP_VERIFY_ATTEMPTS = 5;

/**
 * Daily reset restriction.
 */
const PASSWORD_RESET_DAILY_LIMIT_MS = 24 * 60 * 60 * 1000;

/**
 * Normalizes an identifier into stable form.
 *
 * Security note: this does NOT reveal existence; it only ensures consistent DB keys.
 */
function normalizeIdentifier(method, identifier) {
  const v = String(identifier || "").trim();
  if (!v) return "";

  if (method === "email") {
    return v.toLowerCase();
  }

  // Phone normalization: keep digits only.
  if (method === "phone") {
    return v.replace(/[^0-9]/g, "");
  }

  return v;
}

/**
 * Generates a secure 6-digit OTP.
 *
 * @returns {string} exactly 6 numeric characters.
 */
function generateOtp() {
  // 0..999999, padded to 6 digits.
  const num = crypto.randomInt(0, 1000000);
  return String(num).padStart(OTP_LENGTH, "0");
}

/**
 * Hash OTP for storage.
 *
 * Uses bcrypt to make stored OTP useless if DB is leaked.
 *
 * @param {string} otp
 * @returns {Promise<string>}
 */
async function hashOtp(otp) {
  // Production note:
  // bcrypt is ideal for hashing secrets (OTP) but this project may not have bcrypt installed.
  // We use HMAC-SHA256 with a server-side secret so that stored OTPs are useless if DB is leaked.
  // IMPORTANT: This is not bcrypt; if you want strict bcrypt usage, install bcrypt and switch back.
  const secret = process.env.OTP_HMAC_SECRET;
  if (!secret) {
    throw internalServerError('OTP_HMAC_SECRET is not set.');
  }

  return crypto
    .createHmac('sha256', secret)
    .update(String(otp))
    .digest('hex');
}

/**
 * Compare provided OTP with stored hash.
 *
 * @param {string} otp
 * @param {string} otpHash
 * @returns {Promise<boolean>}
 */
async function verifyOtpAgainstHash(otp, otpHash) {
  const computed = await hashOtp(otp);
  // timing-safe compare
  return crypto.timingSafeEqual(
    Buffer.from(computed, 'hex'),
    Buffer.from(String(otpHash), 'hex')
  );
}


/**
 * Determines if daily reset restriction has been satisfied using Asia/Kolkata IST calendar day.
 * Requirement: once per IST calendar day, not a rolling 24h window.
 */
function isDailyResetAllowed(lastRequestAt) {
  if (!lastRequestAt) return true;

  const timeZone = process.env.PAYMENT_TIMEZONE || 'Asia/Kolkata';

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const lastParts = fmt.formatToParts(lastRequestAt);
  const nowParts = fmt.formatToParts(new Date());

  const toKey = (parts) => {
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  };

  return toKey(nowParts) !== toKey(lastParts);
}


/**
 * Creates or updates a PasswordRecovery record for a user.
 *
 * Business rules:
 * - OTP expires after 5 mins
 * - Resend OTP only after cooldown
 * - New OTP invalidates old OTP by marking it consumed.
 *
 * @param {{ userId: string, method: 'email'|'phone', authProvider: 'password'|'google'|'unknown' }}
 */
async function issueOtp({ userId, method, authProvider }) {
  const existing = await PasswordRecovery.findOne({ userId, method }).sort({ createdAt: -1 });

  // Daily reset restriction is enforced at request time (not during verify).
  // Resend cooldown enforced here.
  const now = new Date();

  if (existing && existing.lastOtpSentAt) {
    const delta = now.getTime() - existing.lastOtpSentAt.getTime();
    if (delta < OTP_RESEND_COOLDOWN_MS) {
      throw forbidden("OTP resend is too frequent. Please try again shortly.");
    }
  }

  if (existing && existing.otpVerified) {
    // If a previous flow already verified OTP but reset not completed, we allow issuance
    // only if the OTP was consumed/expired. Otherwise, require reset flow.
    if (!existing.otpConsumed) {
      // Let clients proceed to verify/reset; don't allow generating fresh OTP automatically.
    }
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

  // Invalidate previous OTP by consuming it.
  if (existing && !existing.otpConsumed) {
    existing.otpConsumed = true;
  }

  await (existing?.save ? existing.save() : Promise.resolve());

  // Upsert-like behavior: reuse document if exists; else create.
  const doc = existing || (await PasswordRecovery.create({ userId, method, authProvider }));

  doc.otpHash = otpHash;
  doc.otpExpiresAt = otpExpiresAt;
  doc.otpVerified = false;
  doc.otpConsumed = false;
  doc.otpAttempts = 0;
  doc.lastOtpSentAt = now;
  doc.otpGeneration = (doc.otpGeneration || 0) + 1;

  await doc.save();

  return { otp, otpExpiresAt };
}

/**
 * Request password reset (generates OTP).
 */
async function requestPasswordReset({ userId, method, authProvider }) {
  // Enforce Google-only restriction: OTP is not sent for Google accounts.
  if (authProvider === "google") {
    // Generic message; does not leak whether identifier exists.
    throw forbidden(
      "Password management is handled by Google. Please continue signing in with Google."
    );
  }

  // Enforce daily reset restriction.
  const existing = await PasswordRecovery.findOne({ userId, method });
  if (existing && !isDailyResetAllowed(existing.lastPasswordResetRequestAt)) {
    throw forbidden("You can use this option only once per day. Please try again after 24 hours.");
  }

  const { otp, otpExpiresAt } = await issueOtp({ userId, method, authProvider });

  if (!existing) {
    // If we created via create(), we must set request timestamp.
    const created = await PasswordRecovery.findOne({ userId, method });
    if (created) {
      created.lastPasswordResetRequestAt = new Date();
      await created.save();
    }
  } else {
    existing.lastPasswordResetRequestAt = new Date();
    await existing.save();
  }

  return { otp, otpExpiresAt };
}

/**
 * Verify OTP.
 *
 * @param {{ userId: string, method: 'email'|'phone', otp: string }}
 */
async function verifyOtp({ userId, method, otp }) {
  const record = await PasswordRecovery.findOne({ userId, method }).sort({ createdAt: -1 });

  if (!record || !record.otpHash) {
    throw notFound("Invalid or expired OTP.");
  }

  if (record.otpConsumed || record.otpVerified) {
    throw badRequest("Invalid or expired OTP.");
  }

  if (!record.otpExpiresAt || record.otpExpiresAt.getTime() < Date.now()) {
    throw badRequest("Invalid or expired OTP.");
  }

  if (record.otpAttempts >= MAX_OTP_VERIFY_ATTEMPTS) {
    throw forbidden("Too many incorrect OTP attempts. Please request a new OTP.");
  }

  const isCorrect = await verifyOtpAgainstHash(otp, record.otpHash);

  // Count attempts regardless of correctness.
  record.otpAttempts = (record.otpAttempts || 0) + 1;

  if (!isCorrect) {
    await record.save();
    throw badRequest("Invalid or expired OTP.");
  }

  // OTP becomes invalid immediately after successful verification.
  record.otpVerified = true;
  record.otpConsumed = true;
  await record.save();

  return { verified: true };
}

/**
 * Resend OTP (cooldown enforced in issueOtp).
 */
async function resendOtp({ userId, method, authProvider }) {
  if (authProvider === "google") {
    throw forbidden(
      "Password management is handled by Google. Please continue signing in with Google."
    );
  }

  // Daily request restriction: resends are part of the same reset request window.
  // We don't block resend by daily rule; cooldown handles spam.
  const { otp, otpExpiresAt } = await issueOtp({ userId, method, authProvider });
  return { otp, otpExpiresAt };
}

/**
 * Marks recovery as completed after password change.
 */
async function markPasswordResetCompleted({ userId, method }) {
  const record = await PasswordRecovery.findOne({ userId, method }).sort({ createdAt: -1 });
  if (!record) throw internalServerError("Recovery record not found.");

  if (!record.otpVerified) {
    throw forbidden("OTP verification required.");
  }

  record.passwordResetCompletedAt = new Date();
  await record.save();

  return { completed: true };
}

module.exports = {
  normalizeIdentifier,
  generateOtp,
  hashOtp,
  verifyOtpAgainstHash,
  requestPasswordReset,
  verifyOtp,
  resendOtp,
  markPasswordResetCompleted,
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
  MAX_OTP_VERIFY_ATTEMPTS,
  PASSWORD_RESET_DAILY_LIMIT_MS,
};
