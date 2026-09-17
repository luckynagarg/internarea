const mongoose = require("mongoose");
const JobSchema = new mongoose.Schema({
  title: String,
  company: String,
  location: String,
  Experience: String,
  category: String,
  aboutCompany: String,
  aboutJob: String,
  whoCanApply: String,
  perks: Array,
  AdditionalInfo: String,
  CTC: String,
  StartDate: String,
  createAt: {
    type: Date,
    default: Date.now,
  },
  // Admin-controlled publish state (defaults to active; backward compatible).
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
});
module.exports = mongoose.model("Job", JobSchema);
