const mongoose = require('mongoose');

// Application-specific profile data linked to Firebase Auth.
// IMPORTANT: This does NOT replace Firebase Auth. It extends it.
// All security derives from Firebase ID tokens in controllers/routes.

const UserProfileSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },

    // NOTE: username / nickname are OPTIONAL. They must NOT have
    // `default: null` — an explicit null value IS included in a sparse
    // index (sparse only omits docs where the field is MISSING), which
    // caused E11000 duplicate-key errors when multiple users had no
    // username yet. The field is simply left ABSENT until set.
    //
    // Uniqueness is enforced via PARTIAL unique indexes (see bottom of
    // this file) that only apply when the field is a non-empty string.
    // IMPORTANT: do NOT also set `unique: true` on the field itself —
    // that creates a duplicate index and Mongoose warns on startup.
    username: {
      type: String,
      trim: true,
      lowercase: true,
    },

    // Public nickname (@username style). Unique, validated 4-20 chars.
    nickname: {
      type: String,
      trim: true,
    },
    // Lowercased copy of nickname for case-insensitive unique + search.
    lowercaseNickname: {
      type: String,
      trim: true,
      lowercase: true,
    },
    // Timestamp of last nickname change (for release-on-change logic).
    nicknameUpdatedAt: { type: Date, default: null },

    name: { type: String, default: null, trim: true },
    email: { type: String, default: null, trim: true, lowercase: true },
    photo: { type: String, default: null },
    profilePhoto: { type: String, default: null },
    coverPhoto: { type: String, default: null },
    // Supabase Storage object path for the current `photo` (when hosted on
    // Supabase). Null for legacy Firebase Storage URLs / external URLs.
    photoStoragePath: { type: String, default: null },

    headline: { type: String, default: null },
    bio: { type: String, default: null },

    // Verified badge flag for users (admin-verified accounts).
    verified: { type: Boolean, default: false },

    location: { type: String, default: null },
    skills: { type: [String], default: [] },

    college: { type: String, default: null },
    company: { type: String, default: null },

    socialLinks: {
      // Flexible structure for future extensibility
      type: Object,
      default: {},
    },

    privacy: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public',
      index: true,
    },

    // Social graph fields (backward-compatible; existing docs will have defaults)
    friends: {
      type: [String],
      default: [],
      index: true,
    },
    friendCount: {
      type: Number,
      default: 0,
      index: true,
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

// Once-per-day password reset restriction for Firebase Auth password updates.
    // Backward compatible: existing users will have `null/undefined`.
    lastPasswordResetAt: { type: Date, default: null },

    // Languages the user has verified via OTP (e.g. switching to French).
    // This is a server-side record so the frontend cannot bypass verification
    // by simply setting a localStorage flag. Backward compatible.
    verifiedLanguages: {
      type: [String],
      default: [],
      index: true,
    },

    // Internal flag for QA/test accounts. Used for maintenance purposes only.
    // Does NOT grant admin privileges. Admin access is enforced separately
    // via Firebase custom claims checked in auth middleware.
    isTestUser: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    // We manage updatedAt manually to keep schema consistent with existing style.
    timestamps: false,
  }
);

// firebaseUid declares `unique: true` in the field definition, which
// creates its unique index. For the optional username/nickname fields we
// use PARTIAL unique indexes: they only apply when the field is an actual
// non-empty string, so any number of users without a username can coexist
// (fixes E11000 "dup key: { username: null }").
UserProfileSchema.index(
  { username: 1 },
  {
    unique: true,
    partialFilterExpression: { username: { $type: 'string' } },
  }
);
UserProfileSchema.index(
  { nickname: 1 },
  {
    unique: true,
    partialFilterExpression: { nickname: { $type: 'string' } },
  }
);
UserProfileSchema.index(
  { lowercaseNickname: 1 },
  {
    unique: true,
    partialFilterExpression: { lowercaseNickname: { $type: 'string' } },
  }
);

UserProfileSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('UserProfile', UserProfileSchema);

