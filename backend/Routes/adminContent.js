/**
 * Admin Job & Internship management routes.
 *
 * Mounted under /api/admin and protected by the parent /admin
 * requireAdminAccess middleware chain.
 */
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Job = require("../Model/Job");
const Internship = require("../Model/Internship");
const { badRequest, notFound } = require("../utils/httpErrors");
const asyncHandler = require("../middleware/asyncHandler");

function parseIntSafe(v, fallback) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

// ----------------------------- Jobs -----------------------------

router.get("/jobs", asyncHandler(async (req, res) => {
  const page = Math.max(parseIntSafe(req.query.page, 1), 1);
  const limit = Math.min(Math.max(parseIntSafe(req.query.limit, 20), 1), 100);
  const skip = (page - 1) * limit;
  const query = {};

  const search = String(req.query.search || "").trim();
  if (search) {
    const re = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    query.$or = [{ title: re }, { company: re }, { category: re }, { location: re }];
  }

  const status = String(req.query.status || "").trim();
  if (status === "active") query.isActive = { $ne: false };
  if (status === "archived") query.isActive = false;

  const [total, items] = await Promise.all([
    Job.countDocuments(query),
    Job.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  return res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
}));

router.post("/jobs", asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.title || !String(b.title).trim()) throw badRequest("title is required.");
  if (!b.company || !String(b.company).trim()) throw badRequest("company is required.");
  if (!b.category || !String(b.category).trim()) throw badRequest("category is required.");

  const job = await Job.create({
    title: String(b.title).trim(),
    company: String(b.company).trim(),
    location: String(b.location || "").trim(),
    Experience: b.Experience,
    category: String(b.category).trim(),
    aboutCompany: b.aboutCompany,
    aboutJob: b.aboutJob,
    whoCanApply: b.whoCanApply,
    perks: Array.isArray(b.perks) ? b.perks : [],
    AdditionalInfo: b.AdditionalInfo,
    CTC: b.CTC,
    StartDate: b.StartDate,
    isActive: b.isActive !== false,
  });

  return res.status(201).json({ success: true, data: job });
}));

router.patch("/jobs/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid job id.");

  const b = req.body || {};
  const allowed = {};
  const fields = ["title", "company", "location", "Experience", "category", "aboutCompany", "aboutJob", "whoCanApply", "AdditionalInfo", "CTC", "StartDate"];
  for (const f of fields) {
    if (b[f] !== undefined) allowed[f] = b[f];
  }
  if (Array.isArray(b.perks)) allowed.perks = b.perks;
  if (b.isActive !== undefined) allowed.isActive = !!b.isActive;

  const updated = await Job.findByIdAndUpdate(id, { $set: allowed }, { new: true }).lean();
  if (!updated) throw notFound("Job not found.");
  return res.json({ success: true, data: updated });
}));

router.delete("/jobs/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid job id.");
  const deleted = await Job.findByIdAndDelete(id).lean();
  if (!deleted) throw notFound("Job not found.");
  return res.json({ success: true, deleted: true });
}));

// -------------------------- Internships --------------------------

router.get("/internships", asyncHandler(async (req, res) => {
  const page = Math.max(parseIntSafe(req.query.page, 1), 1);
  const limit = Math.min(Math.max(parseIntSafe(req.query.limit, 20), 1), 100);
  const skip = (page - 1) * limit;
  const query = {};

  const search = String(req.query.search || "").trim();
  if (search) {
    const re = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    query.$or = [{ title: re }, { company: re }, { category: re }, { location: re }];
  }

  const status = String(req.query.status || "").trim();
  if (status === "active") query.isActive = { $ne: false };
  if (status === "archived") query.isActive = false;

  const [total, items] = await Promise.all([
    Internship.countDocuments(query),
    Internship.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  return res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
}));

router.post("/internships", asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.title || !String(b.title).trim()) throw badRequest("title is required.");
  if (!b.company || !String(b.company).trim()) throw badRequest("company is required.");
  if (!b.category || !String(b.category).trim()) throw badRequest("category is required.");

  const item = await Internship.create({
    title: String(b.title).trim(),
    company: String(b.company).trim(),
    location: String(b.location || "").trim(),
    category: String(b.category).trim(),
    aboutCompany: b.aboutCompany,
    aboutInternship: b.aboutInternship,
    whoCanApply: b.whoCanApply,
    perks: Array.isArray(b.perks) ? b.perks : [],
    numberOfOpening: b.numberOfOpening,
    stipend: b.stipend,
    startDate: b.startDate,
    additionalInfo: b.additionalInfo,
    isActive: b.isActive !== false,
  });

  return res.status(201).json({ success: true, data: item });
}));

router.patch("/internships/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid internship id.");

  const b = req.body || {};
  const allowed = {};
  const fields = ["title", "company", "location", "category", "aboutCompany", "aboutInternship", "whoCanApply", "numberOfOpening", "stipend", "startDate", "additionalInfo"];
  for (const f of fields) {
    if (b[f] !== undefined) allowed[f] = b[f];
  }
  if (Array.isArray(b.perks)) allowed.perks = b.perks;
  if (b.isActive !== undefined) allowed.isActive = !!b.isActive;

  const updated = await Internship.findByIdAndUpdate(id, { $set: allowed }, { new: true }).lean();
  if (!updated) throw notFound("Internship not found.");
  return res.json({ success: true, data: updated });
}));

router.delete("/internships/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid internship id.");
  const deleted = await Internship.findByIdAndDelete(id).lean();
  if (!deleted) throw notFound("Internship not found.");
  return res.json({ success: true, deleted: true });
}));

module.exports = router;
