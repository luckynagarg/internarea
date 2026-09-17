const mongoose = require("mongoose");

const PostReportSchema = new mongoose.Schema(
  {
    postId: { type: String, required: true, index: true },
    reporterId: { type: String, required: true, index: true },
    reason: { type: String, default: "" },
    details: { type: String, default: "" },
    // snapshot of reporter for UI/debug
    reporter: {
      name: { type: String, default: "" },
      photo: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// Prevent duplicate reports by same user for same post
PostReportSchema.index({ postId: 1, reporterId: 1 }, { unique: true });

module.exports = mongoose.model("PostReport", PostReportSchema);

