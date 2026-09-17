const mongoose = require("mongoose");

const PostCommentSchema = new mongoose.Schema({
  postId: { type: String, required: true, index: true },
  author: {
    userId: { type: String, required: true, index: true },
    name: { type: String },
    photo: { type: String },
  },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PostComment", PostCommentSchema);

