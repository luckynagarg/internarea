/**
 * Notification service.
 *
 * Centralizes notification creation for all features (friends, resume,
 * subscription, payment, admin) so every notification carries:
 * - fromUser (actor Firebase UID)
 * - link (client-side navigation)
 * - action (UI button label)
 * - entityType / entityId (deep-link references)
 *
 * Consumers call `createNotification(...)`; the model stores the actor UID and
 * routes use `populateNotificationActors(...)` to attach full UserProfile details.
 */
const Notification = require('../Model/Notification');
const UserProfile = require('../Model/UserProfile');

/**
 * Creates a single notification for a user.
 *
 * @param {Object} opts
 * @param {string} opts.userId - target user Firebase UID
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.body] - optional long-form body
 * @param {string} [opts.type='announcement']
 * @param {string} [opts.fromUser] - actor Firebase UID
 * @param {string} [opts.link]
 * @param {string} [opts.action]
 * @param {string} [opts.entityType]
 * @param {string} [opts.entityId]
 */
async function createNotification({
  userId,
  title,
  message,
  body = null,
  type = 'announcement',
  fromUser = null,
  link = null,
  action = null,
  entityType = null,
  entityId = null,
}) {
  if (!userId || !title || !message) {
    return null;
  }

  try {
    const doc = await Notification.create({
      userId,
      title,
      message,
      body,
      type,
      fromUser,
      link,
      action,
      entityType,
      entityId,
      read: false,
    });
    return doc;
  } catch (err) {
    // Never let a notification failure break the primary flow.
    console.error('[notificationService] createNotification error:', err?.message);
    return null;
  }
}

/**
 * Bulk-create notifications (e.g. admin broadcast).
 */
async function bulkCreateNotifications(docs) {
  if (!Array.isArray(docs) || docs.length === 0) return [];
  const valid = docs.filter(
    (d) => d && d.userId && d.title && d.message
  );
  if (valid.length === 0) return [];
  try {
    return await Notification.insertMany(valid, { ordered: false });
  } catch (err) {
    console.error('[notificationService] bulkCreateNotifications error:', err?.message);
    return [];
  }
}

/**
 * Attaches full actor (fromUser) profile details to a notification document.
 * The Notification model stores `fromUser` as a Firebase UID string; here we
 * hydrate it into a UserProfile-shaped object for the UI.
 *
 * @param {Object} n - lean notification doc
 * @returns {Promise<Object>} notification with actor populated
 */
async function attachActor(notification) {
  if (!notification) return notification;
  const fromUserUid = notification.fromUser;
  if (!fromUserUid) {
    notification.actor = null;
    return notification;
  }

const profile = await UserProfile.findOne({ firebaseUid: fromUserUid })
    .select('firebaseUid name username nickname photo headline bio location verified')
    .lean();

  notification.actor = profile
    ? {
        _id: profile.firebaseUid,
        name: profile.name || null,
        username: profile.username || null,
        nickname: profile.nickname || null,
        photo: profile.photo || null,
        headline: profile.headline || null,
        bio: profile.bio || null,
        location: profile.location || null,
        verified: !!profile.verified,
      }
    : null;

  return notification;
}

/**
 * Hydrates actor details for a list of notifications.
 */
async function populateNotificationActors(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) return [];

  const uids = [
    ...new Set(notifications.map((n) => n.fromUser).filter(Boolean)),
  ];

const profiles = uids.length
    ? await UserProfile.find({ firebaseUid: { $in: uids } })
        .select('firebaseUid name username nickname photo headline bio location verified')
        .lean()
    : [];

  const profileMap = new Map(profiles.map((p) => [p.firebaseUid, p]));

  return notifications.map((n) => {
    const p = n.fromUser ? profileMap.get(n.fromUser) : null;
    return {
      ...n,
      actor: p
        ? {
            _id: p.firebaseUid,
            name: p.name || null,
            username: p.username || null,
            nickname: p.nickname || null,
            photo: p.photo || null,
            headline: p.headline || null,
            bio: p.bio || null,
            location: p.location || null,
            verified: !!p.verified,
          }
        : null,
    };
  });
}

module.exports = {
  createNotification,
  bulkCreateNotifications,
  attachActor,
  populateNotificationActors,
};
