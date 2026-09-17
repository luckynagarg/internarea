const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length === 2,
        message: "A conversation must have exactly 2 participants.",
      },
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    lastMessagePreview: { type: String, default: null },
    lastMessageAt: { type: Date, default: null },
    // Per-participant read tracking: { [firebaseUtc]: lastReadAt }
    readBy: {
      type: Map,
      of: Date,
      default: {},
    },
  },
  { timestamps: true }
);

// Ensure one conversation per unique pair of participants.
// Store participants in sorted order so (A,B) and (B,A) map to the same doc.
ConversationSchema.index({ participants: 1 }, { unique: true });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ "participants": 1, lastMessageAt: -1 });

// Pre-save hook: sort participants to guarantee uniqueness regardless of order.
ConversationSchema.pre("save", function (next) {
  if (Array.isArray(this.participants)) {
    this.participants = [...this.participants].sort();
  }
  next();
});

ConversationSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update && update.participants) {
    update.participants = [...update.participants].sort();
  }
  next();
});

module.exports = mongoose.model("Conversation", ConversationSchema);
