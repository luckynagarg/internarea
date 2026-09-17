/**
 * Invoice model.
 *
 * Stores:
 * - invoiceNumber (public identifier)
 * - PDF file path on the server
 * - payment linkage (paymentId + plan snapshot)
 * - email delivery status
 */
const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema(
  {
    // Authenticated Firebase UID who owns this invoice.
    userId: { type: String, required: true, index: true },

    // Human-readable invoice number used for download and referencing.
    invoiceNumber: { type: String, required: true, unique: true, index: true },

    // Plan at the time of purchase.
    planKey: { type: String, required: true, index: true },

    // Monetary snapshot.
    amountPaid: { type: Number, required: true },
    currency: { type: String, required: true },

    // Razorpay Payment ID (used as a strong reference to the payment).
    paymentId: { type: String, required: true, index: true },

    // Subscription activation window.
    subscriptionStart: { type: Date, required: true },
    subscriptionExpiry: { type: Date, required: true },

    // Where the PDF is saved on the server.
    pdfPath: { type: String, required: true },

    // Email delivery status for best-effort sending.
    emailStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
      index: true,
    },

    emailFailureReason: { type: String, default: null },

    // Extra metadata snapshot (orderId, etc.).
    paymentMeta: { type: Object, default: {} },
  },
  { timestamps: true }
);

// Support efficient invoice lists sorted by recency.
InvoiceSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Invoice', InvoiceSchema);


