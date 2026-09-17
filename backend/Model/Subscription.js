/**
 * Subscription model.
 *
 * Stores the active plan window for each user.
 *
 * Business rules:
 * - Users are assigned Free by default.
 * - Upgraded plans become active only after successful payment verification.
 * - Subscriptions are considered expired once endDate is in the past.
 */
const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema(
  {
    // Firebase UID of the subscriber.
    userId: { type: String, required: true, index: true },

    // planKey: free | bronze | silver | gold
    planKey: { type: String, required: true, index: true },

    // Subscription lifecycle state.
    status: {
      type: String,
      enum: ['active', 'expired'],
      default: 'active',
      index: true,
    },

    // Activation window (start inclusive, end exclusive semantics are handled in services).
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // Useful for auditing and reconciliation.
    lastVerifiedPaymentId: { type: String, index: true, default: null },
  },
  { timestamps: true }
);

// Basic query optimization for “active subscription ordered by endDate”.
SubscriptionSchema.index({ userId: 1, status: 1, endDate: 1 });

module.exports = mongoose.model('Subscription', SubscriptionSchema);


