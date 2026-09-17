const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');

const Notification = require('../Model/Notification');
const { verifyFirebaseIdToken } = require('../middleware/authFirebase');
const { unauthorized, badRequest, internalServerError } = require('../utils/httpErrors');
const { populateNotificationActors } = require('../services/notificationService');

// Map any error to a safe HTTP error for client responses.
function mapErrorToHttpError(err) {
  if (err && err.statusCode) return err;
  return internalServerError(err?.message || 'Internal server error');
}

function toApiNotification(n) {
  const _id = String(n._id ?? n.id ?? '');
  const title = typeof n.title === 'string' ? n.title : '';
  const body =
    typeof n.body === 'string'
      ? n.body
      : typeof n.message === 'string'
        ? n.message
        : undefined;

  const type = typeof n.type === 'string' ? n.type : 'announcement';
  const read = typeof n.read === 'boolean' ? n.read : false;
  const createdAt = n.createdAt ?? null;

  return {
    _id,
    title,
    body,
    type,
    read,
    createdAt,
    actor: n.actor || null,
    link: n.link || null,
    action: n.action || null,
  };
}

// Development-only seed function for notifications.
// Only auto-seed fake notifications in development environment.
async function ensureSeeded(userId) {
  if (process.env.NODE_ENV === 'production') return;
  const existingCount = await Notification.countDocuments({ userId });
  if (existingCount > 0) return;
  // Seed only in non-production environments.
  const seedDocs = [
    { userId, title: 'Welcome!', body: 'Welcome to Intern Area.', type: 'announcement', read: false },
    { userId, title: 'Complete your profile', body: 'Add skills to get better matches.', type: 'reminder', read: false },
  ];
  await Notification.insertMany(seedDocs, { ordered: false });
}

// GET /api/notifications?page=1&limit=20&unreadOnly=true&type=social
router.get('/', verifyFirebaseIdToken, async (req, res) => {
  const userId = req.user?.uid;
  if (!userId) {
    throw unauthorized('Unauthorized');
  }

  try {
    // Only auto-seed fake notifications in development environment.
    if (process.env.NODE_ENV !== 'production') {
      await ensureSeeded(userId);
    }

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);
    const skip = (page - 1) * limit;
    const unreadOnly = String(req.query.unreadOnly || 'false') === 'true';
    const type = req.query.type ? String(req.query.type) : null;

    const query = { userId };
    if (unreadOnly) query.read = false;
    if (type) query.type = type;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    const populated = await populateNotificationActors(notifications || []);

    return res.status(200).json({
      success: true,
      notifications: (populated || []).map(toApiNotification),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (err) {
    console.error('Notifications Error:', err);
    const httpErr = mapErrorToHttpError(err);
    return res.status(httpErr.statusCode || 500).json({
      success: false,
      error: {
        message: httpErr.message || 'Internal Server Error',
        ...(httpErr.details ? { details: httpErr.details } : {}),
      },
    });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', verifyFirebaseIdToken, async (req, res) => {
  const userId = req.user?.uid;
  if (!userId) {
    throw unauthorized('Unauthorized');
  }
  try {
    const unreadCount = await Notification.countDocuments({ userId, read: false });
    return res.status(200).json({ unreadCount });
  } catch (err) {
    console.error('Notifications UnreadCount Error:', err);
    const httpErr = internalServerError(err?.message || 'Internal server error');
    return res.status(httpErr.statusCode || 500).json({
      success: false,
      error: { message: httpErr.message || 'Internal Server Error' },
    });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', verifyFirebaseIdToken, async (req, res) => {
  const userId = req.user?.uid;
  if (!userId) {
    throw unauthorized('Unauthorized');
  }
  try {
    const result = await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );
    return res.status(200).json({ success: true, modifiedCount: result.modifiedCount || 0 });
  } catch (err) {
    console.error('Notifications ReadAll Error:', err);
    const httpErr = internalServerError(err?.message || 'Internal server error');
    return res.status(httpErr.statusCode || 500).json({
      success: false,
      error: { message: httpErr.message || 'Internal Server Error' },
    });
  }
});

// POST /api/notifications/mark-all-read
router.post('/mark-all-read', verifyFirebaseIdToken, async (req, res) => {
  const userId = req.user?.uid;
  if (!userId) {
    throw unauthorized('Unauthorized');
  }
  try {
    const result = await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );
    return res.status(200).json({ success: true, modifiedCount: result.modifiedCount || 0 });
  } catch (err) {
    console.error('Notifications MarkAllRead Error:', err);
    const httpErr = internalServerError(err?.message || 'Internal server error');
    return res.status(httpErr.statusCode || 500).json({
      success: false,
      error: { message: httpErr.message || 'Internal Server Error' },
    });
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', verifyFirebaseIdToken, async (req, res) => {
  const userId = req.user?.uid;
  if (!userId) {
    throw unauthorized('Unauthorized');
  }
  try {
    const { id } = req.params;
    if (!id) throw badRequest('notification id is required');

    const updated = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { $set: { read: true } },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: 'notification not found' });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Notifications MarkRead Error:', err);
    if (err && err.statusCode) {
      return res.status(err.statusCode).json({ success: false, error: { message: err.message } });
    }
    const httpErr = mapErrorToHttpError(err);
    return res.status(httpErr.statusCode || 500).json({
      success: false,
      error: {
        message: httpErr.message || 'Internal Server Error',
        ...(httpErr.details ? { details: httpErr.details } : {}),
      },
    });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', verifyFirebaseIdToken, async (req, res) => {
  const userId = req.user?.uid;
  if (!userId) {
    throw unauthorized('Unauthorized');
  }
  try {
    const { id } = req.params;
    if (!id) throw badRequest('notification id is required');

    const deleted = await Notification.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return res.status(404).json({ error: 'notification not found' });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Notifications Delete Error:', err);
    const httpErr = mapErrorToHttpError(err);
    return res.status(httpErr.statusCode || 500).json({
      success: false,
      error: {
        message: httpErr.message || 'Internal Server Error',
        ...(httpErr.details ? { details: httpErr.details } : {}),
      },
    });
  }
});

module.exports = router;

