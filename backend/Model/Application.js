const mongoose = require("mongoose");

const Applicationipschema = new mongoose.Schema({
  company: String,
  category: String,
  coverLetter: String,
  user: Object, // legacy

  // Auth-enforced user reference
  userId: { type: String, index: true },

  // Normalized identifier of the internship/job being applied to.
  // Populated on every new application; legacy documents leave it unset.
  // Used to enforce "one application per internship/job".
  targetId: { type: String, default: null },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  status: {
    type: String,
    enum: ["accepted", "pending", "rejected"],
    default: "pending",
  },
  Application: Object,
});

Applicationipschema.index({ userId: 1, createdAt: 1 });

// Duplicate-application guard: at most ONE application per (user, target).
// Partial on purpose so legacy documents without a `targetId` never collide
// with each other and existing data is preserved untouched.
Applicationipschema.index(
  { userId: 1, targetId: 1 },
  {
    unique: true,
    partialFilterExpression: { targetId: { $type: "string" } },
  }
);

module.exports = mongoose.model("Application", Applicationipschema);

