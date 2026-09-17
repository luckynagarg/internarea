const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const asyncHandler = require("../middleware/asyncHandler");
const { verifyFirebaseIdToken } = require("../middleware/authFirebase");
const { badRequest } = require("../utils/httpErrors");
const {
  getOrCreateConversation,
  getConversationsForUser,
  getMessages,
  sendMessage,
  markAsRead,
  searchUsers,
} = require("../services/messageService");

// Image upload config (multer + local filesystem).
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "chat-images");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const uniqueName = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPG, PNG, WEBP, GIF.`));
    }
  },
});

// All routes require authentication.
router.use(verifyFirebaseIdToken);

// GET /api/messages/conversations
router.get("/conversations", asyncHandler(async (req, res) => {
  const uid = req.user.uid;
  const conversations = await getConversationsForUser(uid);
  return res.json({ success: true, data: conversations });
}));

// POST /api/messages/conversations
router.post("/conversations", asyncHandler(async (req, res) => {
  const uid = req.user.uid;
  const { targetUid } = req.body;
  if (!targetUid) throw badRequest("targetUid is required.");
  if (targetUid === uid) throw badRequest("Cannot start a conversation with yourself.");

  const conversation = await getOrCreateConversation(uid, targetUid);
  const conversations = await getConversationsForUser(uid);
  const enriched = conversations.find((c) => String(c._id) === String(conversation._id));

  return res.json({ success: true, data: enriched || conversation });
}));

// GET /api/messages/conversations/:conversationId/messages
router.get("/conversations/:conversationId/messages", asyncHandler(async (req, res) => {
  const uid = req.user.uid;
  const { conversationId } = req.params;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const before = req.query.before || null;
  const messages = await getMessages(conversationId, uid, { limit, before });
  return res.json({ success: true, data: messages });
}));

// POST /api/messages/messages (HTTP fallback)
router.post("/messages", asyncHandler(async (req, res) => {
  const uid = req.user.uid;
  const { conversationId, text, imageUrl, messageType } = req.body;
  if (!conversationId) throw badRequest("conversationId is required.");

  const message = await sendMessage({ conversationId, senderId: uid, text, imageUrl, messageType });
  return res.json({ success: true, data: { message } });
}));


// POST /api/messages/upload (image upload)
router.post("/upload", (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ success: false, message: "Image too large. Maximum size is 5 MB." });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest("No image file provided.");
  const relativePath = `/uploads/chat-images/${req.file.filename}`;
  const imageUrl = `${req.protocol}://${req.get("host")}${relativePath}`;
  return res.json({ success: true, data: { imageUrl, filename: req.file.filename, size: req.file.size } });
}));

// PATCH /api/messages/conversations/:conversationId/read
router.patch("/conversations/:conversationId/read", asyncHandler(async (req, res) => {
  const uid = req.user.uid;
  const { conversationId } = req.params;
  const result = await markAsRead(conversationId, uid);
  return res.json({ success: true, data: result });
}));

// GET /api/messages/users/search
router.get("/users/search", asyncHandler(async (req, res) => {
  const uid = req.user.uid;
  const q = req.query.q || "";
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const users = await searchUsers(q, uid, { limit });
  return res.json({ success: true, data: users });
}));

module.exports = router;
