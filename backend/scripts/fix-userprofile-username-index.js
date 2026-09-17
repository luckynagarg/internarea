/**
 * Safe migration: fixes the UserProfile username/nickname unique indexes.
 *
 * Problem this fixes:
 *   E11000 duplicate key error collection: internarea.userprofiles
 *   index: username_1 dup key: { username: null }
 *
 * Root cause: the old schema wrote `username: null` explicitly. MongoDB's
 * SPARSE index only skips documents where the field is MISSING — explicit
 * `null` values ARE indexed, so a second user without a username collided
 * with the first.
 *
 * What this script does (SAFE — no user data is deleted):
 *   1. Converts explicit `username: null` / `nickname: null` /
 *      `lowercaseNickname: null` into "field absent" ($unset).
 *   2. Drops the old unique indexes on those fields (ONLY those three —
 *      firebaseUid and all other indexes are untouched).
 *   3. Recreates them as PARTIAL unique indexes that only apply when the
 *      field is a real string, so multiple users without a username are
 *      allowed.
 *
 * Usage:  node scripts/fix-userprofile-username-index.js
 * Requires MONGODB_URI (from .env) — run against your DEV database first.
 */

require('dotenv').config();

const mongoose = require('mongoose');

const COLLECTION = 'userprofiles';
const FIELDS = ['username', 'nickname', 'lowercaseNickname'];

async function main() {
  const uri =
    process.env.DATABASE_URL ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    process.env.MONGO_URI;
  if (!uri) {
    console.error('DATABASE_URL (or MONGODB_URI) is required.');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const conn = await mongoose
    .createConnection(uri, { serverSelectionTimeoutMS: 10000 })
    .asPromise();

  const coll = conn.collection(COLLECTION);

  // 1. Clean existing null values (convert to "field absent").
  const query = { $or: FIELDS.map((f) => ({ [f]: null })) };
  const unset = FIELDS.reduce((acc, f) => ({ ...acc, [f]: '' }), {});
  const cleaned = await coll.updateMany(query, { $unset: unset });
  console.log(
    `Cleaned ${cleaned.modifiedCount} document(s) with null username/nickname values.`
  );

  // 2. Drop ONLY the old unique indexes on these fields (if present).
  const indexes = await coll.indexes();
  for (const field of FIELDS) {
    const idx = indexes.find(
      (i) =>
        i.name === `${field}_1` &&
        !i.partialFilterExpression // old index = no partial filter
    );
    if (idx) {
      await coll.dropIndex(idx.name);
      console.log(`Dropped old index: ${idx.name}`);
    } else {
      console.log(`Old index for "${field}" not present or already partial — skipping drop.`);
    }
  }

  // 3. Recreate as PARTIAL unique indexes (only real strings are unique).
  for (const field of FIELDS) {
    await coll.createIndex(
      { [field]: 1 },
      {
        unique: true,
        partialFilterExpression: { [field]: { $type: 'string' } },
      }
    );
    console.log(`Created partial unique index on "${field}".`);
  }

  console.log('\nDone. userprofiles collection is now compatible with');
  console.log('the updated UserProfile schema (partial unique indexes).');
  await conn.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration FAILED:', err?.message || err);
  process.exit(1);
});
