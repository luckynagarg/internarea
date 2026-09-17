const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },

    // Optional long-form body (UI shows this when present over message).
    body: { type: String, default: null },

    type: {
      type: String,
      enum: [
        'application',
        'internship',
        'announcement',
        'profile',
        'social',
        'admin',
        'resume',
        'subscription',
        'payment',
      ],
      default: 'announcement',
    },

    read: { type: Boolean, default: false, index: true },

    // Actor (Firebase UID) who triggered the notification.
    fromUser: { type: String, default: null, index: true },

    // Client-side navigation target.
    link: { type: String, default: null },

    // Optional UI button label/action.
    action: { type: String, default: null },

    // Deep-link entity references.
    entityType: { type: String, default: null },
    entityId: { type: String, default: null },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Efficient querying: unread count, newest-first list, actor backfill.
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

// TTL index: auto-delete notifications older than 180 days.
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15552000 });

module.exports = mongoose.model('Notification', NotificationSchema);
