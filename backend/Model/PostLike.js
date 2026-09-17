const mongoose = require("mongoose");

const PostLikeSchema = new mongoose.Schema(
  {
    postId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

PostLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("PostLike", PostLikeSchema);

