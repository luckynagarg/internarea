const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: String, // Firebase UID of the sender
      required: true,
      index: true,
    },
    receiverId: {
      type: String, // Firebase UID of the receiver
      required: true,
      index: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },
    text: {
      type: String,
      default: null,
      trim: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for efficient message retrieval within a conversation.
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, createdAt: 1 });

// Validation: text messages must have text; image messages must have imageUrl.
MessageSchema.pre("validate", function (next) {
  if (this.messageType === "text" && (!this.text || !this.text.trim())) {
    this.invalidate("text", "Text messages must contain non-empty text.");
  }
  if (this.messageType === "image" && !this.imageUrl) {
    this.invalidate("imageUrl", "Image messages must have a valid image URL.");
  }
  next();
});

module.exports = mongoose.model("Message", MessageSchema);
