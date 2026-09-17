/**
 * Application routes.
 *
 * This endpoint is where subscription quota enforcement happens.
 * The backend must never rely on frontend limits alone.
 */
const express = require("express");
const router = express.Router();

// Mongo model for job/internship applications.
const application = require("../Model/Application");

// Firebase ID token verification.
const { verifyFirebaseIdToken } = require("../middleware/authFirebase");

// Async error forwarding helper.
const asyncHandler = require("../middleware/asyncHandler");

// Standard HTTP error helpers.
const { badRequest, notFound } = require("../utils/httpErrors");

// Reusable server-side monthly quota helper (plan + usage + rejection payload).
const quotaService = require("../services/applicationQuotaService");

/** Normalizes the internship/job identifier sent by the client. */
function normalizeTargetId(value) {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) return normalizeTargetId(value[0]);
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  if (typeof value === "number") return String(value);
  return null;
}

/**
 * Create a new application.
 *
 * Request flow (all decisions are made on the server):
 * 1) Verify the Firebase token -> req.user.uid (never a client-supplied user)
 * 2) Resolve the user's active subscription + current IST-month usage
 * 3) Reject with 403 + code APPLICATION_QUOTA_EXCEEDED when the quota is used up
 * 4) Reject duplicates (one application per internship/job) with 409
 * 5) Persist the application for the authenticated userId
 * 6) Re-verify the count to close the concurrent-request overshoot window
 */
router.post("/", verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const { company, category, coverLetter, Application: internshipId } = req.body;
  const body = req.body?.body;

  // Basic validation: required fields must exist.
  if (!company || !category || !coverLetter || !internshipId) {
    throw badRequest(
      "company, category, coverLetter and Application (internship id) are required."
    );
  }

  // Identity comes ONLY from the verified Firebase token.
  const userId = req.user.uid;

  const targetId = normalizeTargetId(internshipId);

  // Enforce the monthly quota server-side BEFORE creating anything.
  const quota = await quotaService.getQuota(userId);

  if (quotaService.isExhausted(quota)) {
    return res.status(403).json(quotaService.quotaExceededPayload(quota));
  }

  // One application per internship/job (checked against the existing data).
  if (targetId) {
    const duplicate = await application.findOne({
      userId,
      $or: [{ targetId }, { Application: targetId }],
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_APPLICATION",
        message: "You have already applied to this internship/job.",
        applicationId: duplicate._id,
      });
    }
  }

  // Persist application.
  // IMPORTANT: Never trust client-supplied user ownership.
  const applicationipdata = new application({
    company,
    category,
    coverLetter,
    user: userId, // store authenticated identity
    userId, // efficient counting
    Application: internshipId,
    targetId,
    body: body || undefined,
  });

  let saved;
  try {
    saved = await applicationipdata.save();
  } catch (err) {
    // Unique (userId, targetId) index raced us: treat as a duplicate.
    if (err && err.code === 11000) {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_APPLICATION",
        message: "You have already applied to this internship/job.",
      });
    }
    throw err;
  }

  // Concurrency guard: if two requests slipped through the pre-check at the
  // same moment, keep the earliest applications and undo this one.
  if (!quota.unlimited) {
    const usedAfter = await application.countDocuments({
      userId,
      createdAt: { $gte: quota.periodStart, $lt: quota.periodEndExclusive },
    });

    if (usedAfter > (quota.limit ?? 0)) {
      await application.deleteOne({ _id: saved._id }).catch(() => {});
      const latest = await quotaService.getQuota(userId);
      return res.status(403).json(quotaService.quotaExceededPayload(latest));
    }
  }

  return res.status(201).json({
    success: true,
    data: saved,
    quota: {
      ...quotaService.quotaInfoPayload({
        ...quota,
        used: quota.used + 1,
      }),
      remaining: quota.unlimited
        ? null
        : Math.max(0, (quota.limit ?? 0) - (quota.used + 1)),
    },
  });
}));

/**
 * List the authenticated user's own applications.
 *
 * Security: requires a valid Firebase token and only returns applications
 * owned by the caller (userId from the verified token). This prevents IDOR /
 * broken access control where any unauthenticated user could read all
 * applications.
 */
router.get("/", verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const data = await application.find({ userId }).sort({ createdAt: -1 }).lean();
  return res.status(200).json({ success: true, data });
}));

/**
 * Fetch a single application by id.
 *
 * Security: only the owner (or an admin) may view an application. We verify
 * ownership against the authenticated token to prevent IDOR.
 */
router.get("/:id", verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.uid;

  const data = await application.findOne({ _id: id, userId }).lean();

  if (!data) {
    throw notFound("application not found");
  }

  return res.status(200).json({ success: true, data });
}));

/**
 * Update own application status.
 *
 * Security: only the owner may update their own application.
 *
 * Expected action values:
 * - accepted
 * - rejected
 */
router.put("/:id", verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.uid;
  const { action } = req.body;

  let status;
  if (action === "accepted") {
    status = "accepted";
  } else if (action === "rejected") {
    status = "rejected";
  } else {
    throw badRequest("Invalid action");
  }

  const updateapplication = await application.findOneAndUpdate(
    { _id: id, userId },
    { $set: { status } },
    { new: true }
  );

  if (!updateapplication) {
    throw notFound("application not found");
  }

  return res.status(200).json({ success: true, data: updateapplication });
}));

module.exports = router;


