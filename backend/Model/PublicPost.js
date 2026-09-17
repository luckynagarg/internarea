const mongoose = require("mongoose");

const PublicPostSchema = new mongoose.Schema({
  author: {
    userId: { type: String, required: true, index: true },
    name: { type: String },
    photo: { type: String },
  },

  caption: { type: String, default: "" },

  // Support multiple images/videos per post.
  media: [
    {
      mediaType: { type: String, enum: ["image", "video"], required: true },
      url: { type: String, required: true },
    },
  ],

  // Optional; can be provided by client or derived later.
  hashtags: { type: [String], default: [] },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PublicPost", PublicPostSchema);


