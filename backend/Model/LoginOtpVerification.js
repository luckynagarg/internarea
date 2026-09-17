const mongoose = require("mongoose");

/**
 * OTP verification challenges for browser-based security (Chrome requirement).
 *
 * Collection is dedicated to login OTP challenges (not password recovery).
 *
 * It also stores the SERVER-SIDE login access state used by the dashboard guard:
 * `accessGrantedAt` is only written by /api/login/start (when no extra
 * verification is required) or by /api/login/verify-otp (after a successful OTP
 * check). A client cannot forge it.
 */
const LoginOtpVerificationSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true, required: true },

    // Not required: phone-only accounts have no email address, and the access
    // state must still be recordable for them.
    email: { type: String, index: true, default: null },

    // Which flow this challenge belongs to (keeps login OTP isolated).
    purpose: { type: String, default: "login_security", index: true },

    // Hashed 6-digit OTP (null for records that only carry access state).
    otpHash: { type: String, default: null },

    otpExpiresAt: { type: Date },


    // Attempts / rate limiting
    otpAttempts: { type: Number, default: 0 },
    maxOtpVerifyAttempts: { type: Number, default: 5 },

    // Single-use invalidation after successful verification
    otpConsumed: { type: Boolean, default: false, index: true },

    // Resend cooldown tracking
    lastOtpSentAt: { type: Date, default: null },

    sessionKey: { type: String, default: null, index: true },
    // Server-side login access state (the security gate's source of truth).
    accessGrantedAt: { type: Date, default: null },
    accessExpiresAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// TTL index deletes expired OTP docs automatically.
LoginOtpVerificationSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

// Fast lookup of a user's latest login-security record.
LoginOtpVerificationSchema.index({ userId: 1, purpose: 1, createdAt: -1 });

module.exports = mongoose.model("LoginOtpVerification", LoginOtpVerificationSchema);

