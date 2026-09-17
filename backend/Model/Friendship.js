const mongoose = require("mongoose");

const FriendshipSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    friendId: { type: String, required: true, index: true },
    nickname: {
      type: String,
      default: null,
      trim: true,
      maxlength: 50,
      index: true,
    },
    status: {
      type: String,
      enum: ["accepted", "pending", "rejected"],
      default: "accepted",
      index: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicates (including reverse duplicates if you store bidirectionally)
FriendshipSchema.index({ userId: 1, friendId: 1 }, { unique: true });

// Efficient lookup of accepted friendships for a given user.
FriendshipSchema.index({ userId: 1, status: 1, friendId: 1 });


module.exports = mongoose.model("Friendship", FriendshipSchema);

