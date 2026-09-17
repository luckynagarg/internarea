const mongoose = require("mongoose");

/**
 * Password recovery document.
 *
 * Security goals:
 * - Store ONLY recovery metadata required for OTP verification.
 * - Never store user passwords.
 * - Store OTP in hashed form.
 * - Invalidate OTP on success (single-use).
 */
const PasswordRecoverySchema = new mongoose.Schema({
  // Federated identity (Firebase Auth UID)
  userId: { type: String, index: true, required: true },

  // Which recovery method was attempted.
  // We keep this for future SMS/email sender integrations.
  method: {
    type: String,
    enum: ["email", "phone"],
    required: true,
  },

  // Provider marker helps enforce Google-only restriction.
  // Values are intentionally generic to avoid leaking auth provider details.
  authProvider: {
    type: String,
    enum: ["password", "google", "unknown"],
    default: "unknown",
    index: true,
  },

  // Hashed 6-digit OTP. Stored as bcrypt hash.
  otpHash: { type: String },

  // OTP expiration timestamp.
  otpExpiresAt: { type: Date },

  // Whether OTP has been successfully verified and should be considered consumed.
  otpVerified: { type: Boolean, default: false },

  // Whether OTP has been consumed. This prevents OTP reuse.
  otpConsumed: { type: Boolean, default: false },

  // Attempt / cooldown tracking.
  otpAttempts: { type: Number, default: 0 },
  lastOtpSentAt: { type: Date },

  // Daily reset request enforcement (backend source of truth).
  lastPasswordResetRequestAt: { type: Date },

  // Successful completion timestamp.
  passwordResetCompletedAt: { type: Date },

  // Optional: when OTP is re-issued, previous OTP should become invalid.
  // This makes the flow robust even if a client still holds old OTP.
  otpGeneration: { type: Number, default: 0 },
});

// TTL index to automatically remove expired OTP records.
// Note: TTL is based on otpExpiresAt.
PasswordRecoverySchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PasswordRecovery", PasswordRecoverySchema);

