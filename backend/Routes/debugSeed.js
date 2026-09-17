const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');

const UserProfile = require('../Model/UserProfile');
const Friendship = require('../Model/Friendship');
const PublicPost = require('../Model/PublicPost');
const PostLike = require('../Model/PostLike');
const PostComment = require('../Model/PostComment');
const DailyPostLimit = require('../Model/DailyPostLimit');
const Notification = require('../Model/Notification');
const { getISTDayKey } = require('../utils/istHelpers');

function getTodayYMD() {
  return getISTDayKey(new Date());
}

function safeString(x) {
  return typeof x === 'string' ? x : '';
}

function safePhoto(x) {
  return typeof x === 'string' ? x : '';
}

// Mirrors the enforced rule in Routes/public.js: 10 friends -> 10/day,
// >10 friends -> unlimited. DEV ONLY helper.
function computeAllowedPerDay(friendsCount) {
  const n = Number(friendsCount) || 0;
  if (n <= 0) return 0;
  if (n > 10) return Number.POSITIVE_INFINITY;
  return n;
}

// POST /api/debug/seed/public
// Seeds enough content to unblock: feed + daily posting limit.
// Body:
//  - userId: string (Firebase uid)
//  - friendCount: number (optional, default 12)
//  - postsCount: number (optional, default 10)
//  - likesPerPost: number (optional, default 3)
//  - commentsPerPost: number (optional, default 2)
//  - notificationsCount: number (optional, default 5)
router.post('/seed/public', async (req, res) => {
  try {
    const {
      userId,
      friendCount = 12,
      postsCount = 10,
      likesPerPost = 3,
      commentsPerPost = 2,
      notificationsCount = 5,
    } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const now = new Date();

    // Ensure we have a user profile doc (some UI expects it, even if not always used).
    await UserProfile.updateOne(
      { firebaseUid: userId },
      { $setOnInsert: { firebaseUid: userId, name: null, email: null, photo: null } },
      { upsert: true }
    );

    // Create dummy friendIds (as pure uid strings). This project’s Friendship model
    // uses userId / friendId as strings, not ObjectIds.
    const friendIds = Array.from({ length: Math.max(0, Number(friendCount)) }, (_, i) =>
      `debug_friend_${userId}_${i + 1}`
    );

    // Upsert accepted friendships: userId -> friendId
    // Also add reverse direction if your Friendship model later expects it.
    const friendshipDocs = [];
    for (const fid of friendIds) {
      friendshipDocs.push({ userId, friendId: fid, status: 'accepted', createdAt: now, updatedAt: now });
      friendshipDocs.push({ userId: fid, friendId: userId, status: 'accepted', createdAt: now, updatedAt: now });
    }

    // InsertMany may fail on dup keys; use unordered to continue.
    await Friendship.insertMany(friendshipDocs, { ordered: false }).catch(() => {});

    // Create some pending friendships too (dashboard may show pending requests)
    const pendingFriendIds = friendIds.slice(0, 5);
    const pendingDocs = pendingFriendIds.map((fid) => ({
      userId,
      friendId: fid + '_pending',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }));
    await Friendship.insertMany(pendingDocs, { ordered: false }).catch(() => {});

    // Seed feed posts
    const today = getTodayYMD();

    const mediaUrl = 'https://images.unsplash.com/photo-1520975916090-3105956dac38?w=640&h=480&fit=crop&crop=faces';

    const posts = [];
    for (let i = 0; i < Math.max(0, Number(postsCount)); i++) {
      posts.push({
        author: {
          userId,
          name: 'Debug User',
          photo: '',
        },
        caption: `Debug post #${i + 1}`,
        media: {
          mediaType: 'image',
          url: mediaUrl,
        },
        createdAt: new Date(now.getTime() - i * 60_000),
        updatedAt: now,
      });
    }

    const insertedPosts = await PublicPost.insertMany(posts, { ordered: false });
    const postDocs = insertedPosts?.map((p) => p) || [];

    // Likes / comments
    const actorIds = friendIds.slice(0, 20).concat([userId]);

    const likes = [];
    const comments = [];

    for (const p of postDocs) {
      for (let i = 0; i < Math.max(0, Number(likesPerPost)); i++) {
        const actor = actorIds[(p.caption.length + i) % actorIds.length];
        likes.push({ postId: p._id, userId: actor, createdAt: now, updatedAt: now });
      }

      for (let i = 0; i < Math.max(0, Number(commentsPerPost)); i++) {
        const actor = actorIds[(p.caption.length + i * 7) % actorIds.length];
        comments.push({
          postId: p._id,
          author: { userId: actor, name: 'Friend', photo: '' },
          text: `Debug comment #${i + 1} on ${safeString(p.caption)}`,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await PostLike.insertMany(likes, { ordered: false }).catch(() => {});
    await PostComment.insertMany(comments, { ordered: false }).catch(() => {});

    // Create a daily post limit document for the user to track count.
    // (Posting-limit logic will update it anyway; this just makes UX consistent.)
    // We set count to min(allowedPerDay, postsCount) so users can post immediately.
    const friendsCount = await Friendship.countDocuments({ userId, status: 'accepted' });
    const allowedPerDay = computeAllowedPerDay(friendsCount);
    if (allowedPerDay !== Number.POSITIVE_INFINITY) {
      await DailyPostLimit.updateOne(
        { userId, date: getTodayYMD() },
        { $set: { count: Math.min(Number(postsCount), allowedPerDay) } },
        { upsert: true }
      );
    }

    // Notifications (best-effort - depends on Notification schema)
    const notifDocs = Array.from({ length: Math.max(0, Number(notificationsCount)) }, (_, i) => ({
      userId,
      title: `Debug notification #${i + 1}`,
      body: `Seeded notification content #${i + 1}`,
      read: i % 2 === 0,
      createdAt: new Date(now.getTime() - i * 30_000),
      updatedAt: now,
    }));

    await Notification.insertMany(notifDocs, { ordered: false }).catch(() => {});

    return res.json({
      ok: true,
      seeded: {
        userId,
        acceptedFriendshipsAttempted: friendshipDocs.length,
        postsAttempted: posts.length,
        likesAttempted: likes.length,
        commentsAttempted: comments.length,
        notificationsAttempted: notifDocs.length,
      },
      snapshot: {
        friendsCount: await Friendship.countDocuments({ userId, status: 'accepted' }),
        allowedPerDay: allowedPerDay === Number.POSITIVE_INFINITY ? 'Infinity' : allowedPerDay,
        postsCount: await PublicPost.countDocuments({ 'author.userId': userId }),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal server error', details: String(err?.message || err) });
  }
});

module.exports = router;

