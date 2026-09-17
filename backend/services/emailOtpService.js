const crypto = require('crypto');
const EmailOtpChallenge = require('../Model/EmailOtpChallenge');
const { badRequest, forbidden, internalServerError } = require('../utils/httpErrors');

const OTP_LENGTH = 6;

// Defaults aligned with your existing login OTP service behavior.
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
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

async function startEmailOtpChallenge({ email }) {
  if (!email) throw badRequest('email is required');

  const existing = await EmailOtpChallenge.findOne({ email }).sort({ createdAt: -1 });
  const now = new Date();

  if (existing?.lastOtpSentAt) {
    const delta = now.getTime() - existing.lastOtpSentAt.getTime();
    if (delta < OTP_RESEND_COOLDOWN_MS) {
      throw forbidden('OTP resend is too frequent. Please try again shortly.');
    }
  }

  // Invalidate previous OTP if it wasn't consumed.
  if (existing && !existing.otpConsumed) {
    existing.otpConsumed = true;
    await existing.save();
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

  const doc = existing || new EmailOtpChallenge({ email });
  doc.otpHash = otpHash;
  doc.otpExpiresAt = otpExpiresAt;
  doc.otpAttempts = 0;
  doc.maxOtpVerifyAttempts = MAX_OTP_VERIFY_ATTEMPTS;
  doc.otpConsumed = false;
  doc.lastOtpSentAt = now;

  await doc.save();

  return { otp, otpExpiresAt };
}

async function verifyEmailOtp({ email, otp }) {
  if (!email) throw badRequest('email is required');
  if (!otp) throw badRequest('otp is required');

  const record = await EmailOtpChallenge.findOne({ email }).sort({ createdAt: -1 });

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

  record.otpConsumed = true;
  await record.save();

  return { verified: true };
}

module.exports = {
  startEmailOtpChallenge,
  verifyEmailOtp,
};

