const mongoose = require("mongoose");

const DailyPostLimitSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  date: { type: String, required: true, index: true }, // YYYY-MM-DD
  count: { type: Number, default: 0 },
});

DailyPostLimitSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("DailyPostLimit", DailyPostLimitSchema);

