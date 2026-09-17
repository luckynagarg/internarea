const express = require("express");
const router = express.Router();

const Job = require("../Model/Job");
const { verifyFirebaseIdToken } = require("../middleware/authFirebase");
const asyncHandler = require("../middleware/asyncHandler");
const { badRequest, internalServerError } = require("../utils/httpErrors");

// POST /api/job — requires a valid Firebase token.
router.post("/", verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const { title, company, location, Experience, category, aboutCompany, aboutJob, whoCanApply, perks, AdditionalInfo, CTC, StartDate } = req.body || {};
  if (!title || !String(title).trim()) throw badRequest("title is required.");
  if (!company || !String(company).trim()) throw badRequest("company is required.");

  const job = await Job.create({
    title: String(title).trim(),
    company: String(company).trim(),
    location: String(location || "").trim(),
    Experience,
    category: String(category || "").trim(),
    aboutCompany,
    aboutJob,
    whoCanApply,
    perks: Array.isArray(perks) ? perks : [],
    AdditionalInfo,
    CTC,
    StartDate,
    postedBy: req.user.uid,
  });
  return res.status(201).json({ success: true, data: job });
}));

// GET /api/job — paginated list of active jobs
router.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const query = { isActive: { $ne: false } };
  const [total, data] = await Promise.all([
    Job.countDocuments(query),
    Job.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);
  return res.status(200).json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!require("mongoose").isValidObjectId(id)) throw badRequest("Invalid job id.");
  const data = await Job.findById(id).lean();
  if (!data) return res.status(404).json({ success: false, message: "Job not found." });
  return res.status(200).json({ success: true, data });
}));

module.exports = router;