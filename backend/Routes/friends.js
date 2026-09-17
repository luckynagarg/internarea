const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { verifyFirebaseIdToken } = require('../middleware/authFirebase');
const { badRequest, forbidden, unauthorized, internalServerError, notFound } = require('../utils/httpErrors');
const FriendRequest = require('../Model/FriendRequest');
const Friendship = require('../Model/Friendship');
const UserProfile = require('../Model/UserProfile');
const Notification = require('../Model/Notification');
const { createNotification } = require('../services/notificationService');

function toUserId(uid) {
  return typeof uid === 'string' ? uid : null;
}

/**
 * Escapes all regex special characters in a string to prevent ReDoS attacks.
 */
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function ensureProfiles(uids) {
  const existing = await UserProfile.find({ firebaseUid: { $in: uids } }).lean();
  const existingSet = new Set(existing.map((x) => x.firebaseUid));
  const missing = uids.filter((id) => !existingSet.has(id));
  if (!missing.length) return;
  await UserProfile.insertMany(
    missing.map((firebaseUid) => ({
      firebaseUid,
      name: null,
      email: null,
      photo: null,
      headline: null,
      bio: null,
      location: null,
      skills: [],
      college: null,
      company: null,
      socialLinks: {},
      privacy: 'public',
      friends: [],
      friendCount: 0,
    })),
    { ordered: false }
  ).catch(() => {});
}

async function areFriends(u1, u2) {
  const c = await Friendship.countDocuments({ userId: u1, friendId: u2, status: 'accepted' });
  return c > 0;
}

async function updateFriendshipUsersForAccepted(u1, u2) {
  const pairs = [
    { userId: u1, friendId: u2 },
    { userId: u2, friendId: u1 },
  ];
  await Promise.all(
    pairs.map(async ({ userId, friendId }) => {
      await Friendship.updateOne(
        { userId, friendId },
        { $set: { status: 'accepted' } },
        { upsert: true }
      );
    })
  );
  await Promise.all([
    UserProfile.updateOne({ firebaseUid: u1 }, { $addToSet: { friends: u2 } }),
    UserProfile.updateOne({ firebaseUid: u2 }, { $addToSet: { friends: u1 } }),
  ]);
  const [u1Count, u2Count] = await Promise.all([
    Friendship.countDocuments({ userId: u1, status: 'accepted' }),
    Friendship.countDocuments({ userId: u2, status: 'accepted' }),
  ]);
  await Promise.all([
    UserProfile.updateOne({ firebaseUid: u1 }, { $set: { friendCount: u1Count } }),
    UserProfile.updateOne({ firebaseUid: u2 }, { $set: { friendCount: u2Count } }),
  ]);
}

function toFriendProfile(profile, relationship) {
  return {
    _id: profile.firebaseUid,
    uid: profile.firebaseUid,
    name: profile.name || null,
    username: profile.username || null,
    nickname: profile.nickname || null,
    photo: profile.photo || profile.profilePhoto || null,
    headline: profile.headline || null,
    bio: profile.bio || null,
    location: profile.location || null,
    friendCount: profile.friendCount || 0,
    relationship: relationship || 'none',
  };
}
// GET /api/friends/pending — pending incoming friend requests (alias for /requests)
router.get('/pending', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const uid = toUserId(req.user?.uid);
  if (!uid) throw unauthorized('Unauthorized');
  const requests = await FriendRequest.find({ receiver: uid, status: 'pending' }).sort({ createdAt: -1 }).lean();
  const senderIds = requests.map((r) => r.sender).filter(Boolean);
  const senders = await UserProfile.find({ firebaseUid: { $in: senderIds } }).lean();
  const senderMap = new Map(senders.map((s) => [s.firebaseUid, s]));
  const data = requests.map((r) => {
    const senderProfile = senderMap.get(r.sender);
    return {
      _id: String(r._id),
      senderId: r.sender,
      receiverId: uid,
      status: 'pending',
      createdAtISO: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      sender: senderProfile ? {
        _id: senderProfile.firebaseUid,
        name: senderProfile.name || null,
        username: senderProfile.username || null,
        nickname: senderProfile.nickname || null,
        photo: senderProfile.photo || null,
        headline: senderProfile.headline || null,
      } : null,
    };
  });
  return res.status(200).json({ success: true, data });
}));

// GET /api/friends/sent — pending sent friend requests
router.get('/sent', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const uid = toUserId(req.user?.uid);
  if (!uid) throw unauthorized('Unauthorized');
  const requests = await FriendRequest.find({ sender: uid, status: 'pending' }).sort({ createdAt: -1 }).lean();
  const receiverIds = requests.map((r) => r.receiver).filter(Boolean);
  const receivers = await UserProfile.find({ firebaseUid: { $in: receiverIds } }).lean();
  const receiverMap = new Map(receivers.map((s) => [s.firebaseUid, s]));
  const data = requests.map((r) => {
    const receiverProfile = receiverMap.get(r.receiver);
    return {
      _id: String(r._id),
      senderId: uid,
      receiverId: r.receiver,
      status: 'pending',
      createdAtISO: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      receiver: receiverProfile ? {
        _id: receiverProfile.firebaseUid,
        name: receiverProfile.name || null,
        username: receiverProfile.username || null,
        nickname: receiverProfile.nickname || null,
        photo: receiverProfile.photo || null,
        headline: receiverProfile.headline || null,
      } : null,
    };
  });
  return res.status(200).json({ success: true, data });
}));

// GET /api/friends/list — accepted friends of the caller
router.get('/list', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const caller = toUserId(req.user?.uid);
  if (!caller) throw unauthorized('Unauthorized');
  const friendships = await Friendship.find({ userId: caller, status: 'accepted' }).lean();
  const friendIds = friendships.map((f) => f.friendId).filter(Boolean);
  if (!friendIds.length) {
    return res.status(200).json({ success: true, data: [], pagination: { total: 0, page: 1, pageSize: 0 } });
  }
  const profiles = await UserProfile.find({ firebaseUid: { $in: friendIds } }).lean();
  const profileMap = new Map(profiles.map((p) => [p.firebaseUid, p]));
  const data = friendIds.map((fid) => {
    const profile = profileMap.get(fid);
    return profile ? toFriendProfile(profile, 'friend') : { _id: fid, uid: fid, relationship: 'friend' };
  });
  return res.status(200).json({ success: true, data, pagination: { total: data.length, page: 1, pageSize: data.length } });
}));

// GET /api/friends/requests � pending friend requests
router.get('/requests', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const uid = toUserId(req.user?.uid);
  if (!uid) throw unauthorized('Unauthorized');
  const requests = await FriendRequest.find({ receiver: uid, status: 'pending' }).sort({ createdAt: -1 }).lean();
  const senderIds = requests.map((r) => r.sender).filter(Boolean);
  const senders = await UserProfile.find({ firebaseUid: { $in: senderIds } }).lean();
  const senderMap = new Map(senders.map((s) => [s.firebaseUid, s]));
  const data = requests.map((r) => ({
    _id: String(r._id),
    sender: r.sender,
    senderName: senderMap.get(r.sender)?.name || null,
    senderPhoto: senderMap.get(r.sender)?.photo || null,
    message: r.message || null,
    createdAt: r.createdAt,
  }));
  return res.status(200).json({ success: true, data });
}));

// POST /api/friends/request — send a friend request
// Accepts both { targetUid } and { receiver } for compatibility.
router.post('/request', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const sender = toUserId(req.user?.uid);
  const receiver = toUserId(req.body?.targetUid || req.body?.receiver);
  if (!sender) throw unauthorized('Unauthorized');
  if (!receiver) throw badRequest('targetUid is required');
  if (sender === receiver) throw badRequest('Cannot friend yourself');
  const existing = await FriendRequest.findOne({ sender, receiver, status: 'pending' });
  if (existing) throw badRequest('Friend request already sent');
  const areAlreadyFriends = await areFriends(sender, receiver);
  if (areAlreadyFriends) throw badRequest('Already friends');
  const request = await FriendRequest.create({ sender, receiver, status: 'pending', message: req.body?.message || null });
  await createNotification({
    userId: receiver,
    type: 'friend_request',
    title: 'New Friend Request',
    message: 'Someone sent you a friend request.',
    actor: sender,
  });
  return res.status(201).json({ success: true, data: { _id: String(request._id) } });
}));

// POST /api/friends/cancel — cancel a sent friend request
// Accepts both { targetUid } and { receiver } for compatibility.
router.post('/cancel', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const sender = toUserId(req.user?.uid);
  const receiver = toUserId(req.body?.targetUid || req.body?.receiver);
  if (!sender) throw unauthorized('Unauthorized');
  if (!receiver) throw badRequest('targetUid is required');
  const request = await FriendRequest.findOne({ sender, receiver, status: 'pending' });
  if (!request) throw notFound('Friend request not found');
  request.status = 'cancelled';
  await request.save();
  return res.status(200).json({ success: true });
}));

// POST /api/friends/accept — accept a friend request
// Accepts both { targetUid } and { sender } for compatibility.
router.post('/accept', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const receiver = toUserId(req.user?.uid);
  const sender = toUserId(req.body?.targetUid || req.body?.sender);
  if (!receiver) throw unauthorized('Unauthorized');
  if (!sender) throw badRequest('targetUid is required');
  const request = await FriendRequest.findOne({ sender, receiver, status: 'pending' });
  if (!request) throw notFound('Friend request not found');
  request.status = 'accepted';
  await request.save();
  await ensureProfiles([sender, receiver]);
  await updateFriendshipUsersForAccepted(sender, receiver);
  await createNotification({
    userId: sender,
    type: 'friend_accepted',
    title: 'Friend Request Accepted',
    message: 'Your friend request was accepted.',
    actor: receiver,
  });
  return res.status(200).json({ success: true });
}));

// POST /api/friends/reject — reject a friend request
// Accepts both { targetUid } and { sender } for compatibility.
router.post('/reject', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const receiver = toUserId(req.user?.uid);
  const sender = toUserId(req.body?.targetUid || req.body?.sender);
  if (!receiver) throw unauthorized('Unauthorized');
  if (!sender) throw badRequest('targetUid is required');
  const request = await FriendRequest.findOne({ sender, receiver, status: 'pending' });
  if (!request) throw notFound('Friend request not found');
  request.status = 'rejected';
  await request.save();
  return res.status(200).json({ success: true });
}));
// GET /api/friends/search � search users (safe regex)
router.get('/search', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const uid = toUserId(req.user?.uid);
  if (!uid) throw unauthorized('Unauthorized');
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(200).json({ success: true, data: [] });
  const safeRe = { $regex: escapeRegex(q), $options: 'i' };
  const users = await UserProfile.find({
    $or: [
      { name: safeRe },
      { username: safeRe },
      { nickname: safeRe },
    ],
  }).limit(20).lean();
  const data = users.map((u) => ({
    _id: u.firebaseUid,
    name: u.name || null,
    username: u.username || null,
    nickname: u.nickname || null,
    photo: u.photo || null,
    headline: u.headline || null,
  }));
  return res.status(200).json({ success: true, data });
}));

// PATCH /api/friends/:friendId/nickname
router.patch('/:friendId/nickname', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const caller = toUserId(req.user?.uid);
  const friendId = toUserId(req.params?.friendId);
  let nickname = req.body?.nickname;
  if (!caller) throw unauthorized('Unauthorized');
  if (!friendId) throw badRequest('friendId is required');
  if (caller === friendId) throw forbidden('Cannot set nickname for yourself.');
  const friendship = await Friendship.findOne({ userId: caller, friendId, status: 'accepted' });
  if (!friendship) throw forbidden('You are not friends.');
  nickname = nickname === undefined ? null : String(nickname);
  nickname = nickname.trim();
  if (!nickname) nickname = null;
  if (nickname && nickname.length > 50) throw badRequest('Nickname must be 50 characters or less.');
  friendship.nickname = nickname;
  await friendship.save();
  return res.status(200).json({ success: true, data: friendship });
}));

// DELETE /api/friends/remove
router.delete('/remove', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const userId = toUserId(req.user?.uid);
  const friendId = toUserId(req.body?.friendId);
  if (!userId) throw unauthorized('Unauthorized');
  if (!friendId) throw badRequest('friendId is required');
  if (userId === friendId) throw forbidden('Cannot remove yourself.');
  const isFriend = await areFriends(userId, friendId);
  if (!isFriend) throw forbidden('You are not friends.');
  await Promise.all([
    Friendship.deleteMany({ userId, friendId, status: 'accepted' }),
    Friendship.deleteMany({ userId: friendId, friendId: userId, status: 'accepted' }),
  ]);
  await Promise.all([
    UserProfile.updateOne({ firebaseUid: userId }, { $pull: { friends: friendId } }),
    UserProfile.updateOne({ firebaseUid: friendId }, { $pull: { friends: userId } }),
  ]);
  const [uCount, fCount] = await Promise.all([
    Friendship.countDocuments({ userId, status: 'accepted' }),
    Friendship.countDocuments({ userId: friendId, status: 'accepted' }),
  ]);
  await Promise.all([
    UserProfile.updateOne({ firebaseUid: userId }, { $set: { friendCount: uCount } }),
    UserProfile.updateOne({ firebaseUid: friendId }, { $set: { friendCount: fCount } }),
  ]);
  return res.status(200).json({ success: true });
}));

module.exports = router;