const express = require('express');
const router = express.Router();

const asyncHandler = require('../middleware/asyncHandler');
const { verifyFirebaseIdToken } = require('../middleware/authFirebase');

const { badRequest, internalServerError } = require('../utils/httpErrors');

const UserProfile = require('../Model/UserProfile');

const { getAuthOrThrow } = require('../config/firebaseAdmin');
const {
  deleteObjectIfOwned,
  objectPathFromPublicUrl,
} = require('../config/supabase');

function safeString(x) {
  return typeof x === 'string' ? x : null;
}

const NICKNAME_REGEX = /^[A-Za-z0-9_]{4,20}$/;

function normalizeNickname(n) {
  return typeof n === 'string' ? n.trim().replace(/^@+/, '') : '';
}

// PATCH /api/profile/nickname
// Change the user's unique nickname. Old nickname becomes available again.
router.patch(
  '/nickname',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized', error: { message: 'Unauthorized' } });

    const raw = normalizeNickname(req.body?.nickname);
    if (!raw) {
      return res.status(400).json({ success: false, message: 'nickname is required', error: { message: 'nickname is required' } });
    }
    if (!NICKNAME_REGEX.test(raw)) {
      return res.status(400).json({
        success: false,
        message: 'Nickname must be 4-20 characters and contain only letters, numbers, and underscores.',
        error: { message: 'Nickname must be 4-20 characters and contain only letters, numbers, and underscores.' },
      });
    }

    const lowercase = raw.toLowerCase();

    // Ensure uniqueness (case-insensitive), excluding self.
    const taken = await UserProfile.findOne({
      lowercaseNickname: lowercase,
      firebaseUid: { $ne: uid },
    }).select('_id').lean();

    if (taken) {
      return res.status(409).json({ success: false, message: 'Nickname is already taken.', error: { message: 'Nickname is already taken.' } });
    }

    // Update profile: set new nickname + lowercase, update timestamp.
    // The old nickname is simply overwritten, thereby freeing it (it is not
    // referenced elsewhere in the app, so no foreign-key cleanup required).
    const updated = await UserProfile.findOneAndUpdate(
      { firebaseUid: uid },
      {
        $set: {
          nickname: raw,
          lowercaseNickname: lowercase,
          nicknameUpdatedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { new: true }
    )
      .select('firebaseUid name username nickname bio photo profilePhoto headline jobs')
      .lean();

    if (!updated) {
      return res.status(500).json({ success: false, message: 'Profile not found. Please bootstrap your profile first.', error: { message: 'Profile not found' } });
    }

    return res.status(200).json({
      success: true,
      message: 'Nickname updated.',
      data: {
        _id: updated.firebaseUid,
        nickname: updated.nickname,
        username: updated.username,
        name: updated.name,
        photo: updated.photo,
      },
    });
  })
);

// POST /api/profile/bootstrap
// Lazy-creates a UserProfile document for the authenticated Firebase user.
// Backward compatible: does not affect any existing routes.
router.post(
  '/bootstrap',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const uid = req.user?.uid;
    const reqUrl = req.originalUrl;

    const logBase = () => ({
      url: reqUrl,
      userId: uid || null,
    });

    try {
      if (!uid) {
        // Auth middleware should normally guarantee uid.
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: { message: 'Unauthorized' },
          ...logBase(),
        });
      }

      const name = safeString(req.user?.name ?? null);
      const email = safeString(req.user?.email ?? null);
      const photo = safeString(req.body?.photo ?? null);

      // ------------------------------------------------------------------
      // Idempotent + concurrency-safe upsert.
      //
      // Keyed on firebaseUid (the authenticated user id) — NEVER username.
      // $setOnInsert only applies on creation, so repeating the call
      // returns/updates the SAME document instead of inserting again.
      // upsert is atomic in MongoDB, so two simultaneous bootstrap
      // requests cannot create two profiles (one wins, the other updates).
      //
      // NOTE: username / nickname are deliberately NOT set here — they are
      // optional and left absent until the user chooses one. Writing
      // `username: null` used to collide on the unique username index
      // (E11000 dup key: { username: null }).
      // ------------------------------------------------------------------
      const now = new Date();

      const setOnInsert = {
        firebaseUid: uid,
        privacy: 'public',
        skills: [],
        socialLinks: {},
        friends: [],
        friendCount: 0,
        verifiedLanguages: [],
        createdAt: now,
      };
      if (name) setOnInsert.name = name;
      if (email) setOnInsert.email = email;
      if (photo) setOnInsert.photo = photo;

      const set = { updatedAt: now };
      // Note: name/email/photo are intentionally NOT in $set — repeat calls
      // must not overwrite values the user may have edited. They are only
      // seeded once via $setOnInsert above.

      let doc;
      try {
        doc = await UserProfile.findOneAndUpdate(
          { firebaseUid: uid },
          { $setOnInsert: setOnInsert, $set: set },
          { upsert: true, new: true, setDefaultsOnInsert: true, lean: true }
        );
      } catch (err) {
        // Rare race: concurrent upsert hit the firebaseUid unique index.
        // The profile now exists — just fetch it (never 500 to the client).
        if (err && err.code === 11000) {
          console.warn('[profile/bootstrap] upsert race hit unique key, fetching existing profile', {
            userId: uid,
          });
          doc = await UserProfile.findOne({ firebaseUid: uid }).lean();
        }
        if (!doc) throw err;
      }

      if (!doc) {
        // Should not happen, but never leave the client with an unexplained 500.
        return res.status(500).json({
          success: false,
          message: 'Could not load profile after bootstrap. Please retry.',
          error: { message: 'Profile not found after upsert' },
          ...logBase(),
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Profile ready',
        data: doc,
        ...logBase(),
      });
    } catch (err) {
      // Never throw uncaught exceptions from this endpoint.
      const message = err?.message ? String(err.message) : 'Internal Server Error';
      console.error('profile/bootstrap error:', {
        message,
        stack: err?.stack,
        ...logBase(),
      });

      return res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: { message },
        ...logBase(),
      });
    }
  })
);

// PATCH /api/profile/photo
// Persist a new profile photo. The front-end uploads the raw image to
// Firebase Storage (via the existing uploadMedia helper) and sends ONLY the
// resulting download URL here — this is the only place the canonical DB write
// happens, so the client is never trusted to write its own profile.
router.patch(
  '/photo',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error: { message: 'Unauthorized' },
      });
    }

    const photoUrl = safeString(req.body?.photoUrl ?? null);
    if (!photoUrl) {
      return res.status(400).json({
        success: false,
        message: 'photoUrl is required',
        error: { message: 'photoUrl is required' },
      });
    }
    // Accept only absolute http(s) URLs (Firebase Storage download URLs).
    if (!/^https?:\/\/.+/i.test(photoUrl)) {
      return res.status(400).json({
        success: false,
        message: 'photoUrl must be a valid http(s) URL',
        error: { message: 'photoUrl must be a valid http(s) URL' },
      });
    }

    // 1) Persist the image reference in the user's DB record (source of truth).
    //    Updating BOTH `photo` and `profilePhoto` keeps every friend/suggestion
    //    view consistent regardless of which field it reads.
    //    `photoStoragePath` records the Supabase object path (when the URL is
    //    ours) so the old object can be cleaned up on replacement. Legacy
    //    Firebase Storage URLs are left untouched and keep working.
    const previous = await UserProfile.findOne({ firebaseUid: uid })
      .select('photo photoStoragePath')
      .lean();

    const newStoragePath = objectPathFromPublicUrl(photoUrl);

    const updated = await UserProfile.findOneAndUpdate(
      { firebaseUid: uid },
      {
        $set: {
          photo: photoUrl,
          profilePhoto: photoUrl,
          photoStoragePath: newStoragePath,
          updatedAt: new Date(),
        },
      },
      { new: true, lean: true }
    );

    // 2) Mirror onto the Firebase user's photoURL so the avatar persists across
    //    sign-in/out and is consistent in Redux/navbar (which read photoURL).
    //    Non-fatal: the DB record above is canonical.
    try {
      const authService = getAuthOrThrow();
      await authService.updateUser(uid, { photoURL: photoUrl });
    } catch (err) {
      console.warn('[profile/photo] could not update Firebase photoURL', {
        userId: uid,
        message: err?.message,
      });
    }

    // 3) Best-effort cleanup of the OLD Supabase image — only AFTER the new
    //    upload is already stored and MongoDB is updated. Old Firebase
    //    Storage images are NEVER deleted here.
    try {
      const oldPath =
        previous?.photoStoragePath || objectPathFromPublicUrl(previous?.photo);
      if (oldPath && oldPath !== newStoragePath) {
        await deleteObjectIfOwned(oldPath, uid);
      }
    } catch (err) {
      console.warn('[profile/photo] old image cleanup skipped', {
        userId: uid,
        message: err?.message,
      });
    }

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found. Please refresh the page and try again.',
        error: { message: 'Profile not found' },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile photo updated.',
      data: {
        _id: updated.firebaseUid,
        photo: updated.photo,
        profilePhoto: updated.profilePhoto,
        name: updated.name ?? null,
      },
    });
  })
);

module.exports = router;


