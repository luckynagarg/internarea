const mongoose = require('mongoose');

const FriendRequestSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true, index: true },
    receiver: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicates of the same directed request.
FriendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

module.exports = mongoose.model('FriendRequest', FriendRequestSchema);

