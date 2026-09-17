/**
 * User deletion service (admin-only).
 *
 * Deletes a single user and ALL application data owned by that user.
 * - Targets are identified by firebaseUid (never username).
 * - Only the target user's records are touched.
 * - MongoDB data is deleted first; the Firebase Auth account is deleted
 *   LAST, so a Firebase failure is surfaced instead of leaving an account
 *   that looks deleted but still authenticates.
 * - Returns a per-collection summary; partial failures are reported
 *   honestly rather than silently.
 */

const LoginOtpVerification = require('../Model/LoginOtpVerification');
const LanguageOtpChallenge = require('../Model/LanguageOtpChallenge');
const ResumeOtpVerification = require('../Model/ResumeOtpVerification');
const PasswordRecovery = require('../Model/PasswordRecovery');
const EmailOtpChallenge = require('../Model/EmailOtpChallenge');
const { getAuthOrThrow } = require('../config/firebaseAdmin');

const UserProfile = require('../Model/UserProfile');
const Resume = require('../Model/Resume');
const Application = require('../Model/Application');
const Notification = require('../Model/Notification');
const Subscription = require('../Model/Subscription');
const PaymentTransaction = require('../Model/PaymentTransaction');
const Invoice = require('../Model/Invoice');
const PublicPost = require('../Model/PublicPost');
const PostComment = require('../Model/PostComment');
const PostLike = require('../Model/PostLike');
const PostReport = require('../Model/PostReport');
const DailyPostLimit = require('../Model/DailyPostLimit');
const FriendRequest = require('../Model/FriendRequest');
const Friendship = require('../Model/Friendship');
const LoginHistory = require('../Model/LoginHistory');

function buildDeletionPlan({ uid, email }) {
  const byUid = (Model, label) => ({
    label,
    run: async () => {
      const res = await Model.deleteMany({ userId: uid });
      return res.deletedCount || 0;
    },
  });

  const plan = [
    byUid(UserProfile, 'UserProfile'),
    byUid(Resume, 'Resume'),
    byUid(Application, 'Application'),
    byUid(Notification, 'Notification'),
    byUid(Subscription, 'Subscription'),
    byUid(PaymentTransaction, 'PaymentTransaction'),
    byUid(Invoice, 'Invoice'),
    byUid(PublicPost, 'PublicPost'),
    byUid(PostComment, 'PostComment'),
    byUid(PostLike, 'PostLike'),
    byUid(PostReport, 'PostReport'),
    byUid(DailyPostLimit, 'DailyPostLimit'),
    byUid(LoginHistory, 'LoginHistory'),
    byUid(LoginOtpVerification, 'LoginOtpVerification'),
    byUid(ResumeOtpVerification, 'ResumeOtpVerification'),
    byUid(PasswordRecovery, 'PasswordRecovery'),
    byUid(LanguageOtpChallenge, 'LanguageOtpChallenge'),
    // FriendRequest is keyed by sender/receiver; only this user's edges.
    {
      label: 'FriendRequest',
      run: async () => {
        const res = await FriendRequest.deleteMany({
          $or: [{ sender: uid }, { receiver: uid }],
        });
        return res.deletedCount || 0;
      },
    },
    // Both directions of friendship rows involving the user.
    {
      label: 'Friendship',
      run: async () => {
        const res = await Friendship.deleteMany({
          $or: [{ userId: uid }, { friendId: uid }],
        });
        return res.deletedCount || 0;
      },
    },
    // Email-keyed OTP challenge (user's verified email).
    {
      label: 'EmailOtpChallenge',
      run: async () => {
        if (!email) return 0;
        const res = await EmailOtpChallenge.deleteMany({ email });
        return res.deletedCount || 0;
      },
    },
  ];

  return plan;
}

/**
 * Remove the deleted user from ex-friends' cached social graph and fix
 * their friendCount. Best-effort: never throws.
 */
async function repairExFriendsGraph(uid) {
  try {
    const edges = await Friendship.find({
      $or: [{ userId: uid }, { friendId: uid }],
    })
      .select('userId friendId')
      .lean();

    const exFriendUids = [
      ...new Set(
        edges.flatMap((f) => [f.userId, f.friendId]).filter((x) => x && x !== uid)
      ),
    ];

    await Promise.all(
      exFriendUids.map(async (friendUid) => {
        await UserProfile.updateOne(
          { firebaseUid: friendUid },
          { $pull: { friends: uid } }
        );
        const count = await Friendship.countDocuments({
          userId: friendUid,
          status: 'accepted',
        });
        await UserProfile.updateOne(
          { firebaseUid: friendUid },
          { $set: { friendCount: count } }
        );
      })
    );
  } catch (err) {
    console.error('[userDeletion] ex-friend graph repair failed:', err?.message);
  }
}

/**
 * Delete a user and all associated data.
 * Returns { summary, errors, firebaseDeleted, firebaseError }.
 * Partial failures are reported honestly instead of silently succeeding.
 */
async function deleteUserCompletely({ uid, email }) {
  const summary = {};
  const errors = [];

  // Repair ex-friends' cached graph BEFORE deleting the friendship edges.
  await repairExFriendsGraph(uid);

  const plan = buildDeletionPlan({ uid, email });
  const results = await Promise.allSettled(plan.map((p) => p.run()));

  results.forEach((r, i) => {
    const label = plan[i].label;
    if (r.status === 'fulfilled') {
      summary[label] = r.value;
    } else {
      summary[label] = 'failed';
      errors.push({ collection: label, error: r.reason?.message || 'unknown' });
      console.error(
        `[userDeletion] failed to delete ${label} for ${uid}:`,
        r.reason?.message
      );
    }
  });

  // Firebase Auth account is deleted LAST (see file header).
  let firebaseDeleted = false;
  let firebaseError = null;
  try {
    const auth = getAuthOrThrow();
    await auth.deleteUser(uid);
    firebaseDeleted = true;
  } catch (err) {
    // auth/user-not-found means the account was already gone — treat as OK.
    if (err?.code === 'auth/user-not-found' || err?.errorInfo?.code === 'auth/user-not-found') {
      firebaseDeleted = true;
    } else {
      firebaseError = err?.message || 'Firebase deletion failed';
      console.error(`[userDeletion] Firebase deletion failed for ${uid}:`, firebaseError);
    }
  }

  return { summary, errors, firebaseDeleted, firebaseError };
}

module.exports = {
  deleteUserCompletely,
};
