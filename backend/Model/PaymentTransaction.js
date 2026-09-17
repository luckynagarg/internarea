/**
 * PaymentTransaction model.
 *
 * This stores the server-side record of a Razorpay checkout attempt.
 *
 * Why we persist this:
 * - Enables reconciliation and debugging (order/payment correlation)
 * - Ensures idempotency boundaries (verified payments -> subscription activation)
 * - Provides a source of truth for the user’s payment history and invoice lookup
 */
const mongoose = require('mongoose');

const PaymentTransactionSchema = new mongoose.Schema(
  {
    // Authenticated Firebase UID of the subscriber.
    userId: { type: String, required: true, index: true },

    // Selected plan at time of order creation (free/bronze/silver/gold).
    planKey: { type: String, required: true, index: true },

    // Price snapshot from the backend plan config.
    amount: { type: Number, required: true },
    currency: { type: String, required: true },

    // Razorpay references.
    razorpayOrderId: { type: String, required: true, index: true },

    // Populated after payment completes.
    razorpayPaymentId: { type: String, index: true, default: null },

    // Stored for audit in this implementation.
    // In production, consider avoiding persistence or masking for safety.
    razorpaySignature: { type: String, default: null },

    // Lifecycle status.
    status: {
      type: String,
      enum: ['created', 'verified', 'failed', 'cancelled'],
      default: 'created',
      index: true,
    },

    // Human-readable failure reason (if known).
    failureReason: { type: String, default: null },

    // Timestamp when the payment was successfully verified server-side.
    verifiedAt: { type: Date, default: null },

    // Store invoice number to link history entries to invoices.
    invoiceNumber: { type: String, index: true, default: null },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Unique order per user prevents accidental double activation for the same order.
PaymentTransactionSchema.index({ userId: 1, razorpayOrderId: 1 }, { unique: true });

// Helpful index for quick lookups by payment id.
PaymentTransactionSchema.index({ userId: 1, razorpayPaymentId: 1 });

// Default sorting for “latest transactions”.
PaymentTransactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PaymentTransaction', PaymentTransactionSchema);


