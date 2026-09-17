const mongoose = require('mongoose');

/**
 * OTP challenge for switching the UI language to French.
 *
 * - userId: authenticated Firebase user (never trust email from frontend)
 * - email: the user's verified email (used for OTP delivery)
 * - otpHash: HMAC-SHA256 hashed OTP (never store plaintext)
 * - otpExpiresAt: expiry (TTL indexed, auto-cleanup)
 * - otpAttempts/maxOtpVerifyAttempts: verification throttling
 * - otpConsumed: single-use invalidation after success
 * - lastOtpSentAt: resend cooldown tracking
 */
const LanguageOtpChallengeSchema = new mongoose.Schema(
    {
    userId: { type: String, required: true },
    email: { type: String, required: true, index: true },

    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },

    otpAttempts: { type: Number, default: 0 },
    maxOtpVerifyAttempts: { type: Number, default: 5 },

    otpConsumed: { type: Boolean, default: false, index: true },

    lastOtpSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Only one active OTP per user.
LanguageOtpChallengeSchema.index({ userId: 1 }, { unique: true });

// TTL auto-cleanup of expired OTPs.
LanguageOtpChallengeSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('LanguageOtpChallenge', LanguageOtpChallengeSchema);
