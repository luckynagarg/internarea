/**
 * Language OTP service.
 *
 * Used to verify a user's identity before switching the UI language to French.
 * Reuses the existing OTP patterns (HMAC hashing, 5-min expiry, throttling,
 * single-use invalidation) and the Resend email delivery service.
 */
const crypto = require('crypto');
const LanguageOtpChallenge = require('../Model/LanguageOtpChallenge');
const UserProfile = require('../Model/UserProfile');
const { badRequest, forbidden, internalServerError } = require('../utils/httpErrors');
const { sendEmailOtp } = require('./emailOtpDeliveryService');

const OTP_LENGTH = 6;
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_OTP_VERIFY_ATTEMPTS = 5;

function generateOtp() {
  const num = crypto.randomInt(0, 1000000);
  return String(num).padStart(OTP_LENGTH, '0');
}

async function hashOtp(otp) {
  const secret = process.env.OTP_HMAC_SECRET;
  if (!secret) throw internalServerError('OTP_HMAC_SECRET is not set.');
  return crypto.createHmac('sha256', secret).update(String(otp)).digest('hex');
}

function timingSafeEqualHex(aHex, bHex) {
  const aBuf = Buffer.from(String(aHex), 'hex');
  const bBuf = Buffer.from(String(bHex), 'hex');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

async function verifyOtpAgainstHash(otp, otpHash) {
  const computed = await hashOtp(otp);
  return timingSafeEqualHex(computed, otpHash);
}

/**
 * Issue a French-language OTP to the authenticated user's verified email.
 *
 * @param {{ userId: string, email: string, name?: string }}
 * @returns {Promise<{otp: string, otpExpiresAt: Date}>} OTP is returned only
 *          for internal email sending; it is never returned to the client.
 */
async function issueLanguageOtp({ userId, email, name }) {
  if (!userId) throw badRequest('userId is required.');
  if (!email) throw badRequest('Verified email is required to receive the OTP.');

  const now = new Date();

  // Enforce resend cooldown.
  const existing = await LanguageOtpChallenge.findOne({ userId });
  if (existing?.lastOtpSentAt) {
    const delta = now.getTime() - existing.lastOtpSentAt.getTime();
    if (delta < OTP_RESEND_COOLDOWN_MS) {
      throw forbidden('OTP resend is too frequent. Please try again shortly.');
    }
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

  // Upsert: only one active OTP per user (unique index on userId).
  const doc =
    existing ||
    new LanguageOtpChallenge({ userId, email });

  doc.email = email;
  doc.otpHash = otpHash;
  doc.otpExpiresAt = otpExpiresAt;
  doc.otpAttempts = 0;
  doc.maxOtpVerifyAttempts = MAX_OTP_VERIFY_ATTEMPTS;
  doc.otpConsumed = false;
  doc.lastOtpSentAt = now;

  await doc.save();

  // Send OTP email (best-effort; if it fails, we still keep the challenge).
  await sendEmailOtp({
    toEmail: email,
    toName: name || '',
    otp,
  });

  return { otp, otpExpiresAt };
}

/**
 * Verify a French-language OTP.
 *
 * - 5-minute expiry
 * - throttled attempts
 * - single-use invalidation after success
 *
 * @param {{ userId: string, otp: string }}
 * @returns {Promise<{verified: boolean}>}
 */
async function verifyLanguageOtp({ userId, otp }) {
  if (!userId) throw badRequest('userId is required.');
  if (!otp) throw badRequest('otp is required.');

  const record = await LanguageOtpChallenge.findOne({ userId });

  if (!record || !record.otpHash) throw badRequest('Invalid or expired OTP.');
  if (record.otpConsumed) throw badRequest('Invalid or expired OTP.');
  if (!record.otpExpiresAt || record.otpExpiresAt.getTime() < Date.now()) {
    throw badRequest('Invalid or expired OTP.');
  }

  if (record.otpAttempts >= record.maxOtpVerifyAttempts) {
    throw forbidden('Too many incorrect OTP attempts. Please request a new OTP.');
  }

  const isCorrect = await verifyOtpAgainstHash(otp, record.otpHash);

  record.otpAttempts = (record.otpAttempts || 0) + 1;

  if (!isCorrect) {
    await record.save();
    throw badRequest('Invalid or expired OTP.');
  }

  // Single-use invalidation after successful verification.
  record.otpConsumed = true;
  await record.save();

  // Persist the verified language preference on the user's profile so the
  // backend can validate it (frontend cannot bypass with localStorage alone).
  await UserProfile.findOneAndUpdate(
    { firebaseUid: userId },
    { $addToSet: { verifiedLanguages: 'fr' } },
    { upsert: true, setDefaultsOnInsert: true }
  ).catch((e) => {
    // Non-fatal: OTP is still verified, but we log to aid debugging.
    console.error('[languageOtpService] failed to persist verifiedLanguages:', e?.message);
  });

  return { verified: true };
}

/**
 * Checks whether a user has already verified the French language via OTP.
 *
 * @param {string} userId
 * @returns {Promise<{ verified: boolean }>}
 */
async function isLanguageVerified(userId, lang = 'fr') {
  if (!userId) return { verified: false };
  const profile = await UserProfile.findOne({ firebaseUid: userId })
    .select('verifiedLanguages')
    .lean();
  const verified = !!(
    profile &&
    Array.isArray(profile.verifiedLanguages) &&
    profile.verifiedLanguages.includes(lang)
  );
  return { verified };
}

module.exports = {
  issueLanguageOtp,
  verifyLanguageOtp,
  isLanguageVerified,
  OTP_LENGTH,
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
  MAX_OTP_VERIFY_ATTEMPTS,
};
