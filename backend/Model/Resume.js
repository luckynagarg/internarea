const mongoose = require('mongoose');

/**
 * Resume model for premium resume creation.
 *
 * Stores:
 * - student-entered resume form snapshot
 * - optional photo URL/path
 * - generated resume PDF path (after successful payment)
 * - payment state
 */
const ResumeSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },

    // snapshot of form fields (keep structure flexible)
    resumeData: {
      type: Object,
      required: true,
    },

    // photo reference from frontend upload/storage
    photoUrl: { type: String, default: null },

    // generated artifacts
    resumePdfPath: { type: String, default: null },

    // visibility: 'private' (owner only) or 'public' (shareable)
    visibility: {
      type: String,
      enum: ['private', 'public'],
      default: 'private',
      index: true,
    },

    // lifecycle
    status: {
      type: String,
      enum: [
        'otp_pending',
        'otp_verified',
        'payment_pending',
        'paid_not_generated',
        'generated',
        'failed',
      ],
      default: 'otp_pending',
      index: true,
    },

    // payment correlation
    payment: {
      transactionId: { type: String, default: null },
      razorpayOrderId: { type: String, default: null },
      razorpayPaymentId: { type: String, default: null },
      razorpaySignature: { type: String, default: null },
      paidAt: { type: Date, default: null },
    },

    otpVerifiedAt: { type: Date, default: null },
    otpVerificationAttempts: { type: Number, default: 0 },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

ResumeSchema.index({ userId: 1, createdAt: -1 });
ResumeSchema.index({ visibility: 1, createdAt: -1 });

module.exports = mongoose.model('Resume', ResumeSchema);
