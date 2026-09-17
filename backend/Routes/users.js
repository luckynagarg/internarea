const express = require('express');
const router = express.Router();

const asyncHandler = require('../middleware/asyncHandler');
const { verifyFirebaseIdToken } = require('../middleware/authFirebase');

const { badRequest, forbidden, unauthorized, notFound } = require('../utils/httpErrors');

const UserProfile = require('../Model/UserProfile');
const Friendship = require('../Model/Friendship');
const FriendRequest = require('../Model/FriendRequest');

/**
 * Nickname validation.
 * - Only letters, numbers and underscore.
 * - Length 4-20 characters.
 */
const NICKNAME_REGEX = /^[A-Za-z0-9_]{4,20}$/;

function isValidNickname(n) {
  return typeof n === 'string' && NICKNAME_REGEX.test(n);
}

function normalizeNickname(n) {
  return typeof n === 'string' ? n.trim() : '';
}

/**
 * Computes the set of accepted friend IDs for a user.
 */
async function getFriendIds(uid) {
  const friendships = await Friendship.find({ userId: uid, status: 'accepted' })
    .select('friendId')
    .lean();
  return new Set(friendships.map((f) => f.friendId));
}

/**
 * Computes mutual friend count between a caller and a target user.
 */
async function getMutualCount(callerUid, targetUid) {
  if (!callerUid || !targetUid || callerUid === targetUid) return 0;
  const [callerFriends, targetFriends] = await Promise.all([
    Friendship.find({ userId: callerUid, status: 'accepted' }).select('friendId').lean(),
    Friendship.find({ userId: targetUid, status: 'accepted' }).select('friendId').lean(),
  ]);
  const callerSet = new Set(callerFriends.map((f) => f.friendId));
  return targetFriends.filter((f) => callerSet.has(f.friendId)).length;
}

/**
 * Determines the relationship status between a caller and a target user.
 * Returns one of: 'none' | 'request_sent' | 'request_received' | 'friends'
 */
async function getRelationship(callerUid, targetUid) {
  if (!callerUid || !targetUid || callerUid === targetUid) return 'none';
  if (await Friendship.countDocuments({ userId: callerUid, friendId: targetUid, status: 'accepted' })) {
    return 'friends';
  }
  if (await FriendRequest.countDocuments({ sender: callerUid, receiver: targetUid, status: 'pending' })) {
    return 'request_sent';
  }
  if (await FriendRequest.countDocuments({ sender: targetUid, receiver: callerUid, status: 'pending' })) {
    return 'request_received';
  }
  return 'none';
}

// ---------------------------------------------------------------------------
// GET /api/users/check-nickname?nickname=...
// Public availability check. Returns suggested normalized value.
// ---------------------------------------------------------------------------
router.get(
  '/check-nickname',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const raw = req.query?.nickname;
    if (!raw) {
      return res.status(200).json({ available: false, valid: false, message: 'nickname is required' });
    }

    const nickname = normalizeNickname(raw).replace(/^@+/, '');
    if (!nickname) {
      return res.status(200).json({ available: false, valid: false, message: 'Nickname is empty.' });
    }

    if (!isValidNickname(nickname)) {
      return res.status(200).json({
        available: false,
        valid: false,
        message: 'Nickname must be 4-20 characters and contain only letters, numbers, and underscores.',
      });
    }

    const lowercase = nickname.toLowerCase();

    // Exclude the caller's own current nickname (so re-submitting it is allowed).
    const caller = req.user?.uid;
    const own = caller
      ? await UserProfile.findOne({ firebaseUid: caller }).select('lowercaseNickname').lean()
      : null;

    const taken = await UserProfile.findOne({
      lowercaseNickname: lowercase,
      ...(own?.lowercaseNickname === lowercase ? { firebaseUid: { $ne: caller } } : {}),
    }).select('_id').lean();

    return res.status(200).json({
      available: !taken,
      valid: true,
      message: taken ? 'Nickname is already taken.' : 'Nickname is available!',
    });
  })
);

// ---------------------------------------------------------------------------
// GET /api/users/search?q=...
// Search all users by name OR nickname. Excludes self. Relationship-aware.
// ---------------------------------------------------------------------------
router.get(
  '/search',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const caller = req.user?.uid;
    if (!caller) throw unauthorized('Unauthorized');

    const qRaw = String(req.query?.q || '').trim();
    if (!qRaw) return res.status(200).json({ success: true, data: [] });

    // Search term (strip leading @ for nickname search)
    const term = qRaw.replace(/^@+/, '').trim();
    if (!term) return res.status(200).json({ success: true, data: [] });

    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);

    // Match name, username, nickname (case-insensitive via lowercaseNickname),
    // or email — so users can find each other by the email they signed up with.
    const users = await UserProfile.find({
      $or: [
        { name: { $regex: regex } },
        { username: { $regex: regex } },
        { nickname: { $regex: regex } },
        { lowercaseNickname: { $regex: regex } },
        { email: { $regex: regex } },
      ],
      firebaseUid: { $ne: caller },
    })
      .select('firebaseUid name username nickname bio photo profilePhoto coverPhoto headline location college company skills friendCount createdAt')
      .limit(limit)
      .lean();

    // Compute relationship + mutual count for each result.
    const callerFriendIds = await getFriendIds(caller);
    const result = await Promise.all(
      users.map(async (u) => {
        const uid = u.firebaseUid;
        const relationship = callerFriendIds.has(uid)
          ? 'friends'
          : await getRelationship(caller, uid);
        const mutual = await getMutualCount(caller, uid);
      return {
        _id: uid,
        uid,
        name: u.name || null,
        username: u.username || null,
        nickname: u.nickname || null,
        bio: u.bio || null,
        photo: u.photo || u.profilePhoto || null,
        coverPhoto: u.coverPhoto || null,
        headline: u.headline || null,
        location: u.location || null,
        college: u.college || null,
        company: u.company || null,
        skills: Array.isArray(u.skills) ? u.skills : [],
        friendCount: u.friendCount || 0,
        mutualFriends: mutual,
        relationship, // 'none' | 'request_sent' | 'request_received' | 'friends'
        joined: u.createdAt ?? null,
      };
      })
    );

    return res.status(200).json({ success: true, data: result });
  })
);

// ---------------------------------------------------------------------------
// GET /api/users/suggestions?limit=20
// Suggest users the caller is not friends with and hasn't already requested.
// ---------------------------------------------------------------------------
router.get(
  '/suggestions',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const caller = req.user?.uid;
    if (!caller) throw unauthorized('Unauthorized');

    const limit = Math.min(Math.max(parseInt(req.query.limit || '12', 10), 1), 30);

    // Backfill the caller's profile if it doesn't exist yet (e.g. brand-new
    // signup that never hit /api/profile/bootstrap), so this user is
    // discoverable by others in search and suggestions.
    const callerExists = await UserProfile.exists({ firebaseUid: caller });
    if (!callerExists) {
      try {
        await UserProfile.create({
          firebaseUid: caller,
          name: req.user?.name || null,
          email: req.user?.email || null,
          // username/nickname left absent (optional) — never write null.
          headline: null,
          bio: null,
          location: null,
          skills: [],
          college: null,
          company: null,
          socialLinks: {},
          privacy: 'public',
        });
      } catch (e) {
        // Non-fatal — continue with suggestions even if backfill fails.
        console.error('suggestions: profile backfill failed:', e?.message);
      }
    }

    const callerFriendIds = await getFriendIds(caller);

    // Users who already have a request with caller (either direction, pending).
    const requestDocs = await FriendRequest.find({
      $or: [{ sender: caller }, { receiver: caller }],
      status: 'pending',
    }).lean();
    const requestUids = new Set(
      requestDocs.flatMap((r) => [r.sender, r.receiver]).filter((id) => id !== caller)
    );

    const exclude = new Set([caller, ...callerFriendIds, ...requestUids]);

    const suggestions = await UserProfile.find({ firebaseUid: { $nin: [...exclude] } })
      .select('firebaseUid name username nickname bio photo profilePhoto headline location college company skills friendCount createdAt')
      .sort({ friendCount: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const result = await Promise.all(
      suggestions.map(async (u) => {
        const uid = u.firebaseUid;
        return {
          _id: uid,
          uid,
          name: u.name || null,
          username: u.username || null,
          nickname: u.nickname || null,
          bio: u.bio || null,
          photo: u.photo || u.profilePhoto || null,
          headline: u.headline || null,
          location: u.location || null,
          college: u.college || null,
          company: u.company || null,
          skills: Array.isArray(u.skills) ? u.skills : [],
          friendCount: u.friendCount || 0,
          mutualFriends: await getMutualCount(caller, uid),
          relationship: 'none',
          joined: u.createdAt ?? null,
        };
      })
    );

    return res.status(200).json({ success: true, data: result });
  })
);

// ---------------------------------------------------------------------------
// GET /api/users/profile/:id
// Public profile for any user (by firebaseUid). Also returns relationship.
// ---------------------------------------------------------------------------
router.get(
  '/profile/:id',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const caller = req.user?.uid;
    const targetUid = req.params?.id;

    if (!caller) throw unauthorized('Unauthorized');
    if (!targetUid) throw badRequest('User id is required');

    const profile = await UserProfile.findOne({ firebaseUid: targetUid })
      .select('firebaseUid name username nickname bio photo profilePhoto coverPhoto headline location college company skills friendCount createdAt updatedAt privacy')
      .lean();

    if (!profile) throw notFound('User not found.');

    // Respect privacy: if user is private and not friends, hide private fields.
    const isSelf = caller === targetUid;
    const isFriend = await Friendship.countDocuments({ userId: caller, friendId: targetUid, status: 'accepted' }) > 0;
    const canView = isSelf || isFriend || profile.privacy === 'public';

    const relationship = isSelf ? 'self' : await getRelationship(caller, targetUid);

    let mutual = 0;
    if (!isSelf) mutual = await getMutualCount(caller, targetUid);

    const data = {
      _id: profile.firebaseUid,
      uid: profile.firebaseUid,
      name: profile.name || null,
      username: profile.username || null,
      nickname: profile.nickname || null,
      bio: canView ? (profile.bio || null) : null,
      photo: profile.photo || profile.profilePhoto || null,
      coverPhoto: profile.coverPhoto || null,
      headline: canView ? (profile.headline || null) : null,
      location: canView ? (profile.location || null) : null,
      college: canView ? (profile.college || null) : null,
      company: canView ? (profile.company || null) : null,
      skills: canView ? (profile.skills || []) : [],
      friendCount: profile.friendCount || 0,
      mutualFriends: mutual,
      relationship, // 'self' | 'none' | 'request_sent' | 'request_received' | 'friends'
      joined: profile.createdAt ?? null,
      isPrivate: profile.privacy === 'private' && !isFriend && !isSelf,
    };

    return res.status(200).json({ success: true, data });
  })
);

module.exports = router;

