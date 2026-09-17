/**
 * Admin Application Management routes.
 *
 * All routes are mounted under /api/admin and therefore protected by the
 * parent /admin requireAdminAccess middleware chain (see Routes/index.js).
 * Role verification happens server-side; a normal user cannot call these.
 */
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Application = require("../Model/Application");

const { badRequest, notFound } = require("../utils/httpErrors");
const asyncHandler = require("../middleware/asyncHandler");

// Whitelist of allowed sort fields (prevents NoSQL / arbitrary sort injection).
const ALLOWED_SORT = new Set([
  "createdAt",
  "company",
  "category",
  "status",
  "_id",
]);

// Whitelist of allowed status filters.
const ALLOWED_STATUS = new Set(["pending", "accepted", "rejected"]);

function parseIntSafe(v, fallback) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * GET /api/admin/applications
 * Searchable, filterable, paginated list of ALL applications.
 */
router.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(parseIntSafe(req.query.page, 1), 1);
  const limit = Math.min(Math.max(parseIntSafe(req.query.limit, 20), 1), 100);
  const skip = (page - 1) * limit;

  const query = {};

  // Safe search across string fields.
  const search = String(req.query.search || "").trim();
  if (search) {
    const re = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    query.$or = [
      { company: re },
      { category: re },
      { coverLetter: re },
      { "user.name": re },
      { userId: re },
    ];
  }

  // Status filter (whitelist enforced).
  const status = String(req.query.status || "").trim();
  if (status && ALLOWED_STATUS.has(status)) {
    query.status = status;
  }

  // Validate sort field against whitelist.
  const sortField = String(req.query.sortBy || "createdAt");
  const sortDir = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
  const sortKey = ALLOWED_SORT.has(sortField) ? sortField : "createdAt";

  const [total, items] = await Promise.all([
    Application.countDocuments(query),
    Application.find(query)
      .sort({ [sortKey]: sortDir, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return res.status(200).json({
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  });
}));

/**
 * PATCH /api/admin/applications/:id/status
 * Update an application's status (accepted/rejected/pending).
 * Validated ObjectId + enum before querying.
 */
router.patch("/:id/status", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid application id.");

  const nextStatus = String(status || "").toLowerCase();
  if (!ALLOWED_STATUS.has(nextStatus)) throw badRequest("Invalid status value.");

  const updated = await Application.findOneAndUpdate(
    { _id: id },
    { $set: { status: nextStatus } },
    { new: true }
  ).lean();

  if (!updated) throw notFound("Application not found.");

  return res.status(200).json({ success: true, data: updated });
}));

/** GET /api/admin/applications/:id — single application detail. */
router.get("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid application id.");

  const app = await Application.findById(id).lean();
  if (!app) throw notFound("Application not found.");

  return res.status(200).json({ success: true, data: app });
}));

module.exports = router;