const mongoose = require('mongoose');

/**
 * Short-lived OTP verification challenges for resume purchase.
 *
 * Separate from login OTP to avoid mixing purposes. The `purpose` field binds a
 * challenge to a single use case so an OTP issued for one flow can never satisfy
 * another flow's server-side gate.
 */
const ResumeOtpVerificationSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true, required: true },
    email: { type: String, index: true, required: true },

    // What this OTP authorises.
    purpose: {
      type: String,
      enum: ['premium_resume_purchase'],
      default: 'premium_resume_purchase',
      index: true,
    },

    // Hashed 6-digit OTP
    otpHash: { type: String, required: true },

    otpExpiresAt: { type: Date },


    // attempts / throttling
    otpAttempts: { type: Number, default: 0 },
    maxOtpVerifyAttempts: { type: Number, default: 5 },

    // single use
    otpConsumed: { type: Boolean, default: false, index: true },

    lastOtpSentAt: { type: Date, default: null },

    // Short-lived server-side verification state. Created ONLY by a successful
    // OTP verification and required by the payment create-order endpoint, so a
    // client cannot bypass the OTP step by sending `otpVerified: true`.
    verifiedAt: { type: Date, default: null },
    verificationExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ResumeOtpVerificationSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

// Fast lookup of the user's latest challenge for a given purpose.
ResumeOtpVerificationSchema.index({ userId: 1, purpose: 1, createdAt: -1 });

module.exports = mongoose.model('ResumeOtpVerification', ResumeOtpVerificationSchema);

