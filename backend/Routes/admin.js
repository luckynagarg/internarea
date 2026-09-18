const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const AdminConfig = require("../Model/AdminConfig");
const UserProfile = require("../Model/UserProfile");
const { getAuthOrThrow } = require("../config/firebaseAdmin");
const { deleteUserCompletely } = require("../services/userDeletionService");
const { issueAdminSessionToken } = require("../middleware/adminSession");
const adminuser = process.env.ADMIN_USER || "admin";
const adminpass = process.env.ADMIN_PASS || "admin";
const rateLimit = require("express-rate-limit");

module.exports = router;

// Brute-force / abuse protection for the admin login endpoint — the default
// ADMIN_USER/ADMIN_PASS fall back to "admin"/"admin", so the login path must
// be rate-limited even when no stronger credential has been set.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "TOO_MANY_REQUESTS",
    message: "Too many admin login attempts. Please try again later.",
  },
});

// ---------------------------------------------------------------------------
// GET /api/admin/users
// Admin-only. Lists Firebase Auth users (paged) enriched with their
// UserProfile data. Query: ?search=<email or name>&limit&nextPageToken
// ---------------------------------------------------------------------------
router.get("/users", async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || "100"), 10), 1),
      500
    );
    const search = String(req.query.search || "").trim().toLowerCase();
    const pageToken = String(req.query.nextPageToken || "") || undefined;

    const auth = getAuthOrThrow();
    const list = await auth.listUsers(limit, pageToken);

    const uidSet = new Set(list.users.map((u) => u.uid));
    const profiles = await UserProfile.find({
      firebaseUid: { $in: [...uidSet] },
    })
      .select(
        "firebaseUid name username nickname email photo friendCount createdAt"
      )
      .lean();
    const profileByUid = new Map(profiles.map((p) => [p.firebaseUid, p]));

    let users = list.users.map((u) => {
      const profile = profileByUid.get(u.uid) || null;
      return {
        uid: u.uid,
        email: u.email || profile?.email || null,
        name: u.displayName || profile?.name || null,
        nickname: profile?.nickname || null,
        photo: u.photoURL || profile?.photo || null,
        emailVerified: !!u.emailVerified,
        disabled: !!u.disabled,
        friendCount: profile?.friendCount || 0,
        createdAt: u.metadata?.creationTime || profile?.createdAt || null,
        lastSignInAt: u.metadata?.lastSignInTime || null,
      };
    });

    // Server-side search filter (email / name / uid).
    if (search) {
      users = users.filter(
        (u) =>
          (u.email && u.email.toLowerCase().includes(search)) ||
          (u.name && u.name.toLowerCase().includes(search)) ||
          (u.nickname && String(u.nickname).toLowerCase().includes(search)) ||
          u.uid.toLowerCase().includes(search)
      );
    }

    return res.status(200).json({
      success: true,
      data: users,
      nextPageToken: list.pageToken || null,
    });
  } catch (err) {
    console.error("[admin/users] list failed:", err?.message);
    return res.status(500).json({
      success: false,
      message: "Could not load users. Please try again later.",
    });
  }
});


// ---------------------------------------------------------------------------
// DELETE /api/admin/users/:userId
// Admin-only. Deletes the user and ALL their associated application data
// (MongoDB + Firebase Auth). The admin performing the deletion comes from
// the verified Firebase token (req.user), never from the request body.
// ---------------------------------------------------------------------------
router.delete("/users/:userId", async (req, res) => {
  const adminUid = req.user?.uid;
  const adminEmail = req.user?.email || null;
  const targetUid = String(req.params?.userId || "").trim();

  try {
    if (!targetUid) {
      return res
        .status(400)
        .json({ success: false, message: "User id is required." });
    }

    // Never allow an admin to accidentally delete themselves.
    if (targetUid === adminUid) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    // Verify the target exists before deleting anything.
    let targetAuthUser = null;
    try {
      targetAuthUser = await getAuthOrThrow().getUser(targetUid);
    } catch (err) {
      if (err?.code !== "auth/user-not-found") {
        console.error("[admin/users] Firebase lookup failed:", err?.message);
        return res.status(500).json({
          success: false,
          message: "Could not verify the user. Please try again later.",
        });
      }
    }
    const targetProfile = await UserProfile.findOne({ firebaseUid: targetUid })
      .select("email name")
      .lean();

    if (!targetAuthUser && !targetProfile) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const targetEmail = targetAuthUser?.email || targetProfile?.email || null;

    // Delete all associated data (Mongo first, Firebase last).
    const { summary, errors, firebaseDeleted } = await deleteUserCompletely({
      uid: targetUid,
      email: targetEmail,
    });

    if (!firebaseDeleted) {
      // Firebase deletion failed — be honest about the partial state.
      return res.status(500).json({
        success: false,
        message:
          "Application data was deleted but the login account could not be removed. Please retry or contact support.",
      });
    }

    // Audit log (no credentials/secrets — ids and counts only).
    console.log("[AUDIT] USER_DELETED", {
      action: "USER_DELETED",
      timestamp: new Date().toISOString(),
      adminUid,
      adminEmail,
      deletedUserId: targetUid,
      deletedUserEmail: targetEmail,
      summary,
      ...(errors.length ? { partialErrors: errors } : {}),
    });

    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
      data: { summary },
    });
  } catch (err) {
    console.error("[admin/users] deletion failed:", {
      adminUid,
      targetUid,
      error: err?.message,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to delete the user. Please try again later.",
    });
  }
});

/**
 * POST /api/admin/adminlogin
 *
 * Authenticates admin using either:
 * 1. Env-var credentials (ADMIN_USER / ADMIN_PASS) - fallback/initial
 * 2. DB-stored password hash (set via password reset flow)
 */
router.post("/adminlogin", adminLoginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required.",
    });
  }

  // First, check env-var credentials (fast path, backward compatible)
  if (username === adminuser && password === adminpass) {
    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: {
        token: issueAdminSessionToken(),
        tokenType: "admin-session",
      },
    });
  }

  // If env-var check fails, check DB-stored credential (from password reset)
  try {
    const config = await AdminConfig.findById("admin_config");
    if (config && config.passwordHash && username === adminuser) {
      const isMatch = await bcrypt.compare(password, config.passwordHash);
      if (isMatch) {
        return res.status(200).json({
          success: true,
          message: "Admin login successful",
          data: {
            token: issueAdminSessionToken(),
            tokenType: "admin-session",
          },
        });
      }
    }
  } catch (err) {
    console.error("[adminLogin] DB credential check error:", err.message);
    // Fall through to generic failure
  }

  return res.status(401).json({
    success: false,
    message: "Invalid credentials",
  });
});

/**
 * GET /api/admin/dashboard/stats
 * Real database-backed dashboard metrics. Admin-only (parent /admin guard).
 */
router.get("/dashboard/stats", async (req, res) => {
  try {
    const { getDashboardStats } = require("../services/adminStatsService");
    const data = await getDashboardStats();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[admin] dashboard/stats failed:", err?.message);
    return res.status(500).json({ success: false, message: "Could not load dashboard statistics." });
  }
});

/**
 * GET /api/admin/settings
 * Returns the persisted application settings.
 */
router.get("/settings", async (req, res) => {
  try {
    const Settings = require("../Model/Settings");
    const config = await Settings.getSettingsDoc();
    return res.status(200).json({ success: true, data: config });
  } catch (err) {
    console.error("[admin] settings read failed:", err?.message);
    return res.status(500).json({ success: false, message: "Could not load settings." });
  }
});

/**
 * PUT /api/admin/settings
 * Persists validated (non-secret) settings. Whitelists the allowed keys so an
 * attacker cannot inject arbitrary schema fields.
 */
router.put("/settings", async (req, res) => {
  try {
    const Settings = require("../Model/Settings");
    const body = req.body || {};
    const config = await Settings.getSettingsDoc();

    const ALLOWED_PLATFORM = ["siteName", "supportEmail", "maxApplicationsPerFree", "enablePublicSpace"];
    const ALLOWED_CONTENT = ["requireApprovalForJobs", "requireApprovalForInternships", "maxCaptionLength"];
    const ALLOWED_NOTIF = ["enableEmailNotifications", "enableSocialNotifications"];

    const pick = (src, keys) => {
      const out = {};
      for (const k of keys) {
        if (src[k] !== undefined) out[k] = src[k];
      }
      return out;
    };

    if (body.platform && typeof body.platform === "object") {
      config.platform = { ...config.platform, ...pick(body.platform, ALLOWED_PLATFORM) };
    }
    if (body.content && typeof body.content === "object") {
      config.content = { ...config.content, ...pick(body.content, ALLOWED_CONTENT) };
    }
    if (body.notifications && typeof body.notifications === "object") {
      config.notifications = { ...config.notifications, ...pick(body.notifications, ALLOWED_NOTIF) };
    }

    config.updatedAt = new Date();
    await config.save();

    return res.status(200).json({ success: true, data: config });
  } catch (err) {
    console.error("[admin] settings update failed:", err?.message);
    return res.status(500).json({ success: false, message: "Could not save settings." });
  }
});
