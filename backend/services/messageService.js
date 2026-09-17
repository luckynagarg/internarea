const Conversation = require("../Model/Conversation");
const Message = require("../Model/Message");
const UserProfile = require("../Model/UserProfile");

/**
 * Get or create a 1-to-1 conversation between two users.
 * Idempotent: always returns the same conversation for the same pair.
 * Uses findOneAndUpdate with $setOnInsert for race-condition safety.
 */
async function getOrCreateConversation(userA, userB) {
  if (!userA || !userB || userA === userB) {
    throw new Error("Cannot start a conversation with yourself.");
  }

  const participants = [userA, userB].sort();

  const profiles = await UserProfile.find({
    firebaseUid: { $in: participants },
  })
    .select("firebaseUid")
    .lean();

  if (profiles.length !== 2) {
    throw new Error("One or both users not found.");
  }

  const conversation = await Conversation.findOneAndUpdate(
    { participants: { $all: participants, $size: 2 } },
    { $setOnInsert: { participants, readBy: {} } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return conversation;
}

/**
 * Get all conversations for a user, enriched with participant profiles
 * and last message details. Sorted by most recent activity.
 */
async function getConversationsForUser(uid) {
  const conversations = await Conversation.find({ participants: uid })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();

  if (!conversations.length) return [];

  const otherUids = conversations.map((c) =>
    c.participants.find((p) => p !== uid)
  );

  const profiles = await UserProfile.find({
    firebaseUid: { $in: otherUids },
  })
    .select("firebaseUid name username nickname photo profilePhoto")
    .lean();
  const profileMap = new Map(profiles.map((p) => [p.firebaseUid, p]));

  const lastMessageIds = conversations
    .map((c) => c.lastMessage)
    .filter(Boolean);
  const lastMessages = await Message.find({
    _id: { $in: lastMessageIds },
  }).lean();
  const lastMessageMap = new Map(
    lastMessages.map((m) => [String(m._id), m])
  );

  const result = await Promise.all(
    conversations.map(async (c) => {
      const otherUid = c.participants.find((p) => p !== uid);
      const profile = profileMap.get(otherUid) || null;
      const lastReadAt = c.readBy?.get?.(uid) || c.readBy?.[uid] || null;

      const unreadFilter = {
        conversationId: c._id,
        senderId: { $ne: uid },
        deletedAt: null,
      };
      if (lastReadAt) {
        unreadFilter.createdAt = { $gt: new Date(lastReadAt) };
      }
      const unreadCount = await Message.countDocuments(unreadFilter);

      const lastMsg = c.lastMessage
        ? lastMessageMap.get(String(c.lastMessage))
        : null;

      return {
        _id: c._id,
        participants: c.participants,
        otherUser: profile
          ? {
              uid: profile.firebaseUid,
              name: profile.name || null,
              username: profile.username || null,
              nickname: profile.nickname || null,
              photo: profile.photo || profile.profilePhoto || null,
            }
        : { uid: otherUid, name: null, nickname: null, photo: null },
        lastMessage: lastMsg
          ? {
              _id: lastMsg._id,
              messageType: lastMsg.messageType,
              text: lastMsg.text,
              imageUrl: lastMsg.imageUrl,
              senderId: lastMsg.senderId,
              createdAt: lastMsg.createdAt,
            }
        : null,
        lastMessageAt: c.lastMessageAt || c.updatedAt || c.createdAt,
        unreadCount,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    })
  );

  return result;
}

/**
 * Get messages for a conversation with pagination.
 * Returns messages oldest-first (for display), with pagination support.
 */
async function getMessages(conversationId, uid, { limit = 50, before } = {}) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: uid,
  }).lean();

  if (!conversation) {
    throw new Error("Conversation not found or access denied.");
  }

  const filter = { conversationId, deletedAt: null };
  if (before) {
    filter.createdAt = { ...filter.createdAt, $lt: new Date(before) };
  }

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return messages.reverse();
}

/**
 * Send a message (text or image). Updates conversation's lastMessage.
 */
async function sendMessage({ conversationId, senderId, text, imageUrl, messageType }) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: senderId,
  });

  if (!conversation) {
    throw new Error("Conversation not found or access denied.");
  }

  const receiverId = conversation.participants.find((p) => p !== senderId);

  const message = await Message.create({
    conversationId,
    senderId,
    receiverId,
    messageType: messageType || (imageUrl ? "image" : "text"),
    text: text || null,
    imageUrl: imageUrl || null,
  });

  conversation.lastMessage = message._id;
  conversation.lastMessagePreview =
    message.messageType === "image" ? "📷 Image" : text;
  conversation.lastMessageAt = message.createdAt;
  await conversation.save();

  return message;
}

/**
 * Mark all messages in a conversation as read for a user.
 */
async function markAsRead(conversationId, uid) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: uid,
  });

  if (!conversation) {
    throw new Error("Conversation not found or access denied.");
  }

  const now = new Date();
  conversation.readBy.set(uid, now);
  await conversation.save();

  await Message.updateMany(
    {
      conversationId,
      senderId: { $ne: uid },
      readAt: null,
      deletedAt: null,
    },
    { $set: { readAt: now } }
  );

  return { success: true, readAt: now };
}

/**
 * Search users by name, nickname, username, or email.
 */
async function searchUsers(query, callerUid, { limit = 20 } = {}) {
  if (!query || !query.trim()) return [];

  const q = query.trim();
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const users = await UserProfile.find(
    {
      firebaseUid: { $ne: callerUid },
      $or: [
        { name: regex },
        { nickname: regex },
        { username: regex },
        { email: regex },
      ],
    },
    {
      firebaseUid: 1,
      name: 1,
      username: 1,
      nickname: 1,
      photo: 1,
      profilePhoto: 1,
      headline: 1,
    }
  )
    .limit(limit)
    .lean();

  return users.map((u) => ({
    uid: u.firebaseUid,
    name: u.name || null,
    username: u.username || null,
    nickname: u.nickname || null,
    photo: u.photo || u.profilePhoto || null,
    headline: u.headline || null,
  }));
}

module.exports = {
  getOrCreateConversation,
  getConversationsForUser,
  getMessages,
  sendMessage,
  markAsRead,
  searchUsers,
};
