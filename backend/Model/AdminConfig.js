const mongoose = require('mongoose');

const adminConfigSchema = new mongoose.Schema(
  {
    // Singleton document: only one config record exists
    _id: { type: String, default: 'admin_config' },

    // Admin credentials stored as bcrypt hash (set via password reset)
    passwordHash: { type: String, default: null },

    // OTP fields for password reset
    otpHash: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    maxOtpAttempts: { type: Number, default: 5 },
    otpConsumed: { type: Boolean, default: false },
    lastOtpSentAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'adminconfigs',
  }
);

module.exports = mongoose.model('AdminConfig', adminConfigSchema);

