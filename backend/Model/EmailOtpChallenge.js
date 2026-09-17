const mongoose = require('mongoose');

/**
 * Generic email OTP challenges.
 *
 * - otpHash: hashed OTP (HMAC)
 * - otpExpiresAt: expiry time (TTL indexed)
 * - otpConsumed: single-use invalidation
 * - otpAttempts/maxOtpVerifyAttempts: verification throttling
 * - lastOtpSentAt: resend cooldown
 */
const EmailOtpChallengeSchema = new mongoose.Schema(
  {
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

// TTL auto-cleanup
EmailOtpChallengeSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmailOtpChallenge', EmailOtpChallengeSchema);

