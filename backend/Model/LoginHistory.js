const mongoose = require("mongoose");

/**
 * Login history (per login attempt).
 *
 * Stored fields are designed to support:
 * - audit trails
 * - profile-based login history UI
 * - security analytics (browser/device/IP/method/status)
 */
const LoginHistorySchema = new mongoose.Schema(
  {
    // --- Backward-compatible fields (already used by existing code) ---
    userId: { type: String, index: true, required: true },
    fullName: { type: String, default: "" },
    emailAddress: { type: String, default: "" },

    loginDate: { type: String, index: true }, // YYYY-MM-DD (IST)
    loginTime: { type: String, index: true }, // HH:mm:ss (IST)

    browserType: { type: String, default: "" },
    browserVersion: { type: String, default: "" },
    operatingSystem: { type: String, default: "" },
    deviceType: {
      type: String,
      enum: ["Desktop", "Laptop", "Tablet", "Mobile", "Unknown"],
      default: "Unknown",
      index: true,
    },
    deviceName: { type: String, default: "" },

    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },

    loginMethod: {
      type: String,
      enum: ["Email & Password", "Google Sign-In", "Unknown"],
      default: "Unknown",
      index: true,
    },

    loginStatus: {
      type: String,
      enum: ["Successful", "Failed", "OTP_Required"],
      default: "Failed",
      index: true,
    },

    logoutTime: { type: Date, default: null },

    // Session duration in seconds (if logout recorded)
    sessionDurationSeconds: { type: Number, default: null },

// --- Required fields (for production-ready spec) ---
    // NOTE: we keep these optional to avoid breaking existing writes.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    firebaseUid: { type: String, index: true },
    name: { type: String, default: '' },
    email: { type: String, default: '' },

    // loginMethod in spec is generic; keep separate from legacy loginMethod.
    // (Frontends will read whichever field they need.)
    // Keep optional.
    loginMethodRaw: { type: String, default: '' },

    // Spec status values
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'BLOCKED'],
      index: true,
    },

    failureReason: { type: String, default: '' },
    otpVerified: { type: Boolean, default: false },

    browser: { type: String, default: '' },
    country: { type: String, default: '' },
    city: { type: String, default: '' },

    // Keep createdAt for spec (timestamps already provides createdAt).
    createdAt: { type: Date },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

// Indexes requested in spec (plus existing backward-compatible indexes)
LoginHistorySchema.index({ user: 1 });
LoginHistorySchema.index({ email: 1 });
LoginHistorySchema.index({ loginTime: -1 });
LoginHistorySchema.index({ status: -1 });

// Backward-compatible indexes
LoginHistorySchema.index({ userId: 1, createdAt: -1 });
LoginHistorySchema.index({ userId: 1, loginDate: -1, loginTime: -1 });


module.exports = mongoose.model("LoginHistory", LoginHistorySchema);

