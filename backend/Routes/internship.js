const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Internship = require("../Model/Internship");
const { verifyFirebaseIdToken } = require("../middleware/authFirebase");
const asyncHandler = require("../middleware/asyncHandler");
const { badRequest, internalServerError } = require("../utils/httpErrors");

router.post("/", verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const { title, company, location, category, aboutCompany, aboutInternship, whoCanApply, perks, numberOfOpening, stipend, startDate, additionalInfo } = req.body || {};
  if (!title || !String(title).trim()) throw badRequest("title is required.");
  if (!company || !String(company).trim()) throw badRequest("company is required.");

  const item = await Internship.create({
    title: String(title).trim(),
    company: String(company).trim(),
    location: String(location || "").trim(),
    category: String(category || "").trim(),
    aboutCompany,
    aboutInternship,
    whoCanApply,
    perks: Array.isArray(perks) ? perks : [],
    numberOfOpening,
    stipend,
    startDate,
    additionalInfo,
    postedBy: req.user.uid,
  });
  return res.status(201).json({ success: true, data: item });
}));

router.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const query = { isActive: { $ne: false } };
  const [total, data] = await Promise.all([
    Internship.countDocuments(query),
    Internship.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);
  return res.status(200).json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid internship id.");
  const data = await Internship.findById(id).lean();
  if (!data) return res.status(404).json({ success: false, message: "Internship not found." });
  return res.status(200).json({ success: true, data });
}));

module.exports = router;
