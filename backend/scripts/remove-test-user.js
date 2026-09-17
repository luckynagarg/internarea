/**
 * Remove the legacy test/demo user (test@test.com) from the application.
 *
 * Maintenance counterpart to the (now removed) create-test-user.js. It deletes
 * ONLY the test account and its associated data — it is always scoped to the
 * resolved firebaseUid and never bulk-deletes other users' records.
 *
 * Removes:
 *   1. The Firebase Auth user for test@test.com.
 *   2. The matching UserProfile document.
 *   3. The matching Subscription document(s).
 *
 * Usage:
 *   node scripts/remove-test-user.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const UserProfile = require('../Model/UserProfile');
const Subscription = require('../Model/Subscription');
const { getAuthOrThrow } = require('../config/firebaseAdmin');

const TEST_EMAIL = 'test@test.com';

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error('Missing DATABASE_URL in environment.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to database:', mongoose.connection.name);

  const auth = getAuthOrThrow();

  // Resolve the test user's firebaseUid. Try Firebase Auth first; if the Auth
  // user is already gone, fall back to the UserProfile document so we can still
  // clean up orphaned DB rows. Never operate without a resolved uid.
  let firebaseUid = null;

  try {
    const userRecord = await auth.getUserByEmail(TEST_EMAIL).catch(() => null);
    if (userRecord) {
      firebaseUid = userRecord.uid;
    }
  } catch (e) {
    console.error('Could not look up test user in Firebase Auth:', e?.message);
  }

  if (!firebaseUid) {
    const profile = await UserProfile.findOne({ email: TEST_EMAIL }).lean();
    if (profile) {
      firebaseUid = profile.firebaseUid;
    }
  }

  if (!firebaseUid) {
    console.log(`No test user found (${TEST_EMAIL}); nothing to remove.`);
    await mongoose.disconnect();
    return;
  }

  // 1) Delete the Firebase Auth user.
  try {
    await auth.deleteUser(firebaseUid);
    console.log(`Deleted Firebase Auth user: ${TEST_EMAIL} (uid: ${firebaseUid})`);
  } catch (e) {
    console.error('Could not delete Firebase Auth user:', e?.message);
  }

  // 2) Delete the UserProfile document (scoped to firebaseUid only).
  try {
    const res = await UserProfile.deleteOne({ firebaseUid });
    console.log(`Removed UserProfile documents: ${res.deletedCount}`);
  } catch (e) {
    console.error('Could not delete UserProfile:', e?.message);
  }

  // 3) Delete the Subscription document(s) (scoped to userId only).
  try {
    const res = await Subscription.deleteMany({ userId: firebaseUid });
    console.log(`Removed Subscription documents: ${res.deletedCount}`);
  } catch (e) {
    console.error('Could not delete Subscription:', e?.message);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
