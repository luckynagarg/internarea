/** Settings model inferred by inference. */
const mongoose = require("mongoose");

/**
 * Singleton settings document (only one record).
 * Stores non-secret, platform-level configuration that is editable by admins
 * and persisted in the database. Environment secrets are NEVER stored here.
 */
const settingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "app_settings" },

    // Platform / application settings.
    platform: {
      siteName: { type: String, default: "InternArea" },
      supportEmail: { type: String, default: "" },
      maxApplicationsPerFree: { type: Number, default: 1 },
      enablePublicSpace: { type: Boolean, default: true },
    },

    // Content moderation toggles.
    content: {
      requireApprovalForJobs: { type: Boolean, default: false },
      requireApprovalForInternships: { type: Boolean, default: false },
      maxCaptionLength: { type: Number, default: 5000 },
    },

    // Notification settings.
    notifications: {
      enableEmailNotifications: { type: Boolean, default: true },
      enableSocialNotifications: { type: Boolean, default: true },
    },

    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "appsettings" }
);

/** Get or create the singleton settings document. */
async function getSettingsDoc() {
  let doc = await mongoose.model("Settings").findById("app_settings");
  if (!doc) {
    doc = await mongoose.model("Settings").create({ _id: "app_settings" });
  }
  return doc;
}

module.exports = mongoose.model("Settings", settingsSchema);
module.exports.getSettingsDoc = getSettingsDoc;