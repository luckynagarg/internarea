const mongoose = require("mongoose");
const Internshipschema = new mongoose.Schema({
  title: String,
  company: String,
  location: String,
  category: String,
  aboutCompany: String,
  aboutInternship: String,
  whoCanApply: String,
  perks: Array,
  numberOfOpening: String,
  stipend: String,
  startDate: String,
  additionalInfo: String,
  createdAt: {
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
module.exports=mongoose.model("Internship",Internshipschema)
