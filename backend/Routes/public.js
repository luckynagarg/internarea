const express = require("express");
const router = express.Router();

const PublicPost = require("../Model/PublicPost");
const PostComment = require("../Model/PostComment");
const PostLike = require("../Model/PostLike");
const Friendship = require("../Model/Friendship");
const DailyPostLimit = require("../Model/DailyPostLimit");

const { verifyFirebaseIdToken } = require("../middleware/authFirebase");
const { badRequest } = require("../utils/httpErrors");
const { getISTDayKey } = require("../utils/istHelpers");
const { createNotification } = require("../services/notificationService");

function getTodayYMD() {
  // Use IST consistently for daily posting limits so they roll over at
  // midnight IST regardless of the server's timezone.
  return getISTDayKey(new Date());
}

/**
 * Business rule (server-side source of truth):
 *   0 friends  -> 0 posts/day
 *   1 friend   -> 1 post/day
 *   ...
 *   10 friends -> 10 posts/day
 *   > 10 friends -> unlimited
 *
 * Never derive this from a client-supplied value.
 */
function computeAllowedPerDay(friendsCount) {
  const n = Number(friendsCount) || 0;
  if (n <= 0) return 0;
  if (n > 10) return Number.POSITIVE_INFINITY;
  return n;
}

/**
 * Counts the authenticated user's accepted friendships directly from MongoDB.
 * This is the authoritative friend count used for the posting quota.
 */
async function countAcceptedFriends(userId) {
  return Friendship.countDocuments({ userId, status: "accepted" });
}

/** Reads the user's posts-used-today counter (defaults to 0). */
async function getUsedToday(userId, dateKey) {
  const doc = await DailyPostLimit.findOne({ userId, date: dateKey })
    .select({ count: 1 })
    .lean();
  return doc && Number.isFinite(doc.count) ? doc.count : 0;
}

/**
 * Atomically reserves one post for the day using the DailyPostLimit counter.
 *
 * Race safety: the counter is created with `$setOnInsert` (idempotent even when
 * two concurrent requests race — the duplicate-key error is swallowed and the
 * conditional `$inc` is retried), then incremented ONLY while
 * `count < allowedPerDay`, which is a single atomic document update in MongoDB.
 *
 * @returns {Promise<object|null>} the updated counter doc, or null when the
 *          daily allowance is already exhausted.
 */
async function reserveDailyPostQuota(userId, dateKey, allowedPerDay) {
  if (!Number.isFinite(allowedPerDay) || allowedPerDay <= 0) return null;

  try {
    await DailyPostLimit.updateOne(
      { userId, date: dateKey },
      { $setOnInsert: { count: 0 } },
      { upsert: true }
    );
  } catch (err) {
    // Concurrent upsert raced us — the doc now exists, so continue.
    if (!err || err.code !== 11000) throw err;
  }

  return DailyPostLimit.findOneAndUpdate(
    { userId, date: dateKey, count: { $lt: allowedPerDay } },
    { $inc: { count: 1 } },
    { new: true }
  );
}

/** Releases a previously reserved slot when post creation fails. */
async function releaseDailyPostQuota(userId, dateKey) {
  await DailyPostLimit.updateOne(
    { userId, date: dateKey, count: { $gt: 0 } },
    { $inc: { count: -1 } }
  ).catch(() => {});
}

/** Standard 403 payload for the Public Space posting quota. */
function sendNoFriends(res, friendCount) {
  return res.status(403).json({
    success: false,
    code: "NO_FRIENDS",
    message: "Add at least one friend before posting.",
    friendCount,
    allowedPerDay: 0,
    usedToday: 0,
    unlimited: false,
  });
}

function sendLimitReached(res, { friendCount, allowedPerDay, usedToday }) {
  return res.status(403).json({
    success: false,
    code: "DAILY_POST_LIMIT_REACHED",
    message: "Daily posting limit reached.",
    friendCount,
    allowedPerDay,
    usedToday,
    unlimited: false,
  });
}

// Auth-protected: create a post. Identity is derived from the verified
// Firebase token (req.user.uid), never from the request body.
router.post("/posts", verifyFirebaseIdToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { name, photo, caption, mediaUrl, mediaType } = req.body;

    // Media is optional — text-only posts are allowed. When media IS provided,
    // validate the media type and require a real http(s) URL so the feed can't
    // be abused as a free-form script/URL sink.
    const hasMedia = !!mediaUrl && !!mediaType;
    if (hasMedia) {
      const ALLOWED_MEDIA_TYPES = ["image", "video"];
      if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
        return res.status(400).json({ error: "mediaType must be image or video." });
      }
      if (typeof mediaUrl !== "string" || !/^https?:\/\/[^\s]+$/i.test(mediaUrl)) {
        return res.status(400).json({ error: "mediaUrl must be a valid http(s) URL." });
      }
    }
    if (caption && typeof caption === "string" && caption.length > 5000) {
      return res.status(400).json({ error: "caption is too long." });
    }

    // ------------------------------------------------------------------
    // Daily posting quota — enforced ENTIRELY from server-side state.
    // Any client-supplied `allowedPerDay` / `friendCount` is ignored.
    // ------------------------------------------------------------------
    const friendsCount = await countAcceptedFriends(userId);

    const allowedPerDay = computeAllowedPerDay(friendsCount);
    const today = getTodayYMD();

    if (allowedPerDay <= 0) {
      return sendNoFriends(res, friendsCount);
    }

    let quotaReserved = false;
    if (Number.isFinite(allowedPerDay)) {
      const reserved = await reserveDailyPostQuota(userId, today, allowedPerDay);
      if (!reserved) {
        const usedToday = await getUsedToday(userId, today);
        return sendLimitReached(res, { friendCount: friendsCount, allowedPerDay, usedToday });
      }
      quotaReserved = true;
    }

    // media is an array of { mediaType, url }. Only include media
    // when both fields are present; otherwise store an empty array
    // (text-only posts are allowed).
    const media = hasMedia
      ? [{ mediaType, url: mediaUrl }]
      : [];

    let post;
    try {
      post = await PublicPost.create({
        author: { userId, name: name || "", photo: photo || "" },
        caption: caption || "",
        media,
      });
    } catch (createErr) {
      // Never consume a user's daily allowance for a post that was not created.
      if (quotaReserved) await releaseDailyPostQuota(userId, today);
      throw createErr;
    }

    return res.status(201).json(post);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "internal server error" });
  }
});

// Public (unauthenticated) feed browsing.
router.get("/posts", async (req, res) => {
  try {

    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
    const cursor = req.query.cursor;

    const query = {};
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const posts = await PublicPost.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const postIds = posts.map((p) => p._id.toString());

    let likesMap = {};
    let commentsMap = {};

    if (postIds.length) {
      const [likesAgg, commentsAgg] = await Promise.all([
        PostLike.aggregate([
          { $match: { postId: { $in: postIds } } },
          { $group: { _id: "$postId", count: { $sum: 1 } } },
        ]),
        PostComment.aggregate([
          { $match: { postId: { $in: postIds } } },
          { $group: { _id: "$postId", count: { $sum: 1 } } },
        ]),
      ]);

      likesMap = Object.fromEntries(likesAgg.map((x) => [x._id, x.count]));
      commentsMap = Object.fromEntries(commentsAgg.map((x) => [x._id, x.count]));
    }

    // Normalize media to a stable shape for the frontend.
    // Schema stores `media` as an array; the public page reads `media.mediaType`
    // and `media.url` directly, so flatten to the first media item (or null).
    const normalizeMedia = (media) => {
      if (!media) return null;
      if (Array.isArray(media)) return media[0] || null;
      return media;
    };

    res.json({
      posts: posts.map((p) => ({
        ...p,
        media: normalizeMedia(p.media),
        likesCount: likesMap[p._id.toString()] || 0,
        commentsCount: commentsMap[p._id.toString()] || 0,
      })),
      nextCursor: posts.length
        ? posts[posts.length - 1].createdAt.toISOString()
        : null,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "internal server error" });
  }
});


// Auth-protected: add a comment. Identity from the token.
router.post("/posts/:postId/comments", verifyFirebaseIdToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.uid;
    const { name, photo, text } = req.body;

    if (!postId) return res.status(400).json({ error: "postId required" });
    if (!text)
      return res.status(400).json({ error: "text required" });

    const comment = await PostComment.create({
      postId,
      author: { userId, name: name || "", photo: photo || "" },
      text,
    });

    // Notify the post author (unless they commented on their own post).
    const post = await PublicPost.findById(postId).lean();
    if (post && post.author && post.author.userId && post.author.userId !== userId) {
      await createNotification({
        userId: post.author.userId,
        title: `${name || 'Someone'} commented on your post`,
        message: text || 'View your post.',
        type: 'social',
        fromUser: userId,
        link: '/public',
        action: 'View',
        entityType: 'post_comment',
        entityId: String(comment._id),
      });
    }

    res.status(201).json(comment);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "internal server error" });
  }
});

// Auth-protected: delete own comment.
router.delete("/posts/:postId/comments/:commentId", verifyFirebaseIdToken, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.uid;

    if (!postId || !commentId) {
      return res.status(400).json({ error: "postId and commentId required" });
    }

    const comment = await PostComment.findOne({ _id: commentId, postId, "author.userId": userId });
    if (!comment) {
      return res.status(404).json({ error: "Comment not found or you are not the author." });
    }

    await PostComment.deleteOne({ _id: comment._id });
    return res.json({ success: true, deleted: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "internal server error" });
  }
});

// Public (unauthenticated) comment browsing.
router.get("/posts/:postId/comments", async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await PostComment.find({ postId })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ comments });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "internal server error" });
  }
});


// Auth-protected: toggle like. Identity from the token.
router.post("/posts/:postId/like", verifyFirebaseIdToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.uid;

    if (!postId) return res.status(400).json({ error: "postId required" });

    const existing = await PostLike.findOne({ postId, userId });

    if (existing) {
      await PostLike.deleteOne({ postId, userId });
      return res.json({ liked: false });
    }

    await PostLike.create({ postId, userId });

    // Notify the post author (unless they liked their own post).
    const post = await PublicPost.findById(postId).lean();
    if (post && post.author && post.author.userId && post.author.userId !== userId) {
      const profile = await require('../Model/UserProfile').findOne({ firebaseUid: userId }).lean();
      const likerName = profile?.name || profile?.username || 'Someone';
      await createNotification({
        userId: post.author.userId,
        title: `${likerName} liked your post`,
        message: 'Tap to view your post.',
        type: 'social',
        fromUser: userId,
        link: '/public',
        action: 'View',
        entityType: 'post_like',
        entityId: String(post._id),
      });
    }

    return res.json({ liked: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "internal server error" });
  }
});

// Auth-protected: delete own post.
router.delete("/posts/:postId", verifyFirebaseIdToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.uid;

    if (!postId) return res.status(400).json({ error: "postId required" });

    const post = await PublicPost.findOne({ _id: postId, "author.userId": userId });
    if (!post) {
      return res.status(404).json({ error: "Post not found or you are not the author." });
    }

    await Promise.all([
      PublicPost.deleteOne({ _id: post._id }),
      PostLike.deleteMany({ postId: post._id }),
      PostComment.deleteMany({ postId: post._id }),
    ]);

    return res.json({ success: true, deleted: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "internal server error" });
  }
});

// Public stats. `likedByMe` is only resolved when a valid token is present.
router.get("/posts/:postId/stats", async (req, res) => {
  try {
    const { postId } = req.params;

    const [likesCount, commentsCount] = await Promise.all([
      PostLike.countDocuments({ postId }),
      PostComment.countDocuments({ postId }),
    ]);

    let likedByMe = false;
    const header = req.headers.authorization;
    const hasBearer = !!header && header.startsWith("Bearer ");
    if (hasBearer) {
      try {
        const token = header.slice("Bearer ".length).trim();
        const { verifyFirebaseIdToken } = require("../middleware/authFirebase");
        // Reuse the middleware in "optional auth" mode by wrapping it.
        // We build a fake handler that only sets req.user on success.
        const next = () => {};
        // Simpler: decode token directly via admin.
        const { getAuthOrThrow } = require("../config/firebaseAdmin");
        const authService = getAuthOrThrow();
        const decoded = await authService.verifyIdToken(token);
        if (decoded && decoded.uid) {
          likedByMe = (await PostLike.findOne({ postId, userId: decoded.uid }))
            ? true
            : false;
        }
      } catch (e) {
        // Invalid/expired token -> treat as unauthenticated.
        likedByMe = false;
      }
    }

    res.json({ likesCount, commentsCount, likedByMe });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "internal server error" });
  }
});

// Auth-protected friends count for posting limits UX + backend rule enforcement.
// The values returned here are informational ONLY — the POST route above always
// recomputes the decision from the database and never trusts the client.
router.get("/friends/count", verifyFirebaseIdToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    const friendsCount = await countAcceptedFriends(userId);
    const allowedPerDay = computeAllowedPerDay(friendsCount);
    const today = getTodayYMD();

    const usedToday =
      allowedPerDay === Number.POSITIVE_INFINITY ? 0 : await getUsedToday(userId, today);

    const unlimited = allowedPerDay === Number.POSITIVE_INFINITY;

    res.json({
      success: true,
      friendsCount,
      allowedPerDay: unlimited ? null : allowedPerDay,
      unlimited,
      usedToday,
      remainingToday: unlimited ? null : Math.max(0, allowedPerDay - usedToday),
      date: today,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "internal server error" });
  }
});

// Auth-protected testing/seed endpoint: create an accepted friendship.
// DEV ONLY — disabled in production because it lets any authenticated user forge
// accepted friendships (with any friendId) and bypass the friend-based posting limits.
router.post("/friends/seed", verifyFirebaseIdToken, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: "Not found." });
  }
  try {
    const userId = req.user.uid;
    const { friendId } = req.body;
    if (!friendId)
      return res.status(400).json({ error: "friendId required" });

    const doc = await Friendship.create({
      userId,
      friendId,
      status: "accepted",
    });

    res.status(201).json(doc);
  } catch (err) {
    // duplicate key, etc.
    if (err && err.code === 11000) {
      return res
        .status(200)
        .json({ success: true, message: "friendship already exists" });
    }
    console.log(err);
    res.status(500).json({ error: "internal server error" });
  }
});

module.exports = router;

// Exported for verification scripts / unit tests. Not part of the HTTP surface.
module.exports.computeAllowedPerDay = computeAllowedPerDay;
module.exports.getTodayYMD = getTodayYMD;
module.exports.reserveDailyPostQuota = reserveDailyPostQuota;
module.exports.releaseDailyPostQuota = releaseDailyPostQuota;
