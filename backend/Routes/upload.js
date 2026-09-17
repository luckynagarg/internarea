/**
 * POST /api/upload — authenticated image upload to Supabase Storage.
 *
 * Replaces the previous client-side Firebase Storage upload (uploadMedia).
 * The browser sends the raw file here (multipart/form-data, field "file");
 * this route validates it, uploads it to Supabase with the service-role
 * key, and returns { mediaType, mediaUrl } — the exact same shape the old
 * Firebase-based helper returned, so existing consumers keep working.
 *
 * Security:
 * - Requires a valid Firebase ID token (Firebase Authentication unchanged).
 * - Only the authenticated user's own folder is written to.
 * - MIME allow-list + 5 MB size limit.
 * - The service-role key never leaves the backend.
 */

const express = require("express");
const router = express.Router();

const multer = require("multer");
const { verifyFirebaseIdToken } = require("../middleware/authFirebase");
const {
  BUCKET_NAME,
  uploadImage,
} = require("../config/supabase");

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB — matches the existing profile-photo limit
const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// Memory storage: the buffer goes straight to Supabase; nothing is written
// to the server's local disk and no binaries are stored in MongoDB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    return cb(
      Object.assign(new Error("Invalid file type. Allowed: jpeg, png, webp."), {
        statusCode: 400,
      })
    );
  },
});

// Folders a caller may target. "profile-images" for avatars, "public-space"
// for public post media (mirrors the old Firebase Storage layout).
const ALLOWED_FOLDERS = ["profile-images", "public-space"];

router.post(
  "/",
  verifyFirebaseIdToken,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const message =
          err.code === "LIMIT_FILE_SIZE"
            ? "Image must be smaller than 5 MB."
            : `Upload rejected: ${err.message}`;
        return res.status(400).json({ success: false, message, error: { message } });
      }
      if (err) {
        const status = err.statusCode || 500;
        return res
          .status(status)
          .json({ success: false, message: err.message, error: { message: err.message } });
      }
      return next();
    });
  },
  async (req, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
          error: { message: "Unauthorized" },
        });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "file is required",
          error: { message: "file is required" },
        });
      }

      const folder = ALLOWED_FOLDERS.includes(req.body?.folder)
        ? req.body.folder
        : "profile-images";

      const { objectPath, publicUrl } = await uploadImage({
        userId: uid,
        buffer: file.buffer,
        mimeType: file.mimetype,
        fileName: file.originalname,
        folder,
      });

      const mediaType = file.mimetype.startsWith("video/") ? "video" : "image";

      return res.status(201).json({
        success: true,
        mediaType,
        mediaUrl: publicUrl,
        storagePath: objectPath,
        bucket: BUCKET_NAME,
      });
    } catch (err) {
      // Log the real error server-side; return a generic message to the client
      // (never expose the service-role key or internal config).
      console.error("[upload] Supabase upload failed:", err?.message);
      const status = err?.statusCode || 500;
      const message =
        status === 503
          ? err.message
          : "Could not upload the image. Please try again.";
      return res
        .status(status)
        .json({ success: false, message, error: { message } });
    }
  }
);

module.exports = router;
