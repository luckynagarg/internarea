/**
 * Supabase Storage client (server-side ONLY).
 *
 * Supabase is used ONLY as an object/file store for user-uploaded images
 * (profile photos, public-space post media). It does NOT replace Firebase
 * Authentication or MongoDB.
 *
 * SECURITY:
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must exist ONLY in the
 *   backend environment (Render / local .env). They must NEVER be exposed
 *   to the browser (no NEXT_PUBLIC_* prefix, never returned in responses).
 * - Uploads go through the authenticated backend route (Routes/upload.js);
 *   the browser never talks to Supabase directly.
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Dedicated bucket for user images (created on first use if missing).
const BUCKET_NAME = "profile-images";

let client = null;

/**
 * Lazily create the service-role Supabase client.
 * Throws a clear (non-sensitive) error when env vars are missing.
 */
function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const err = new Error(
      "File storage is not configured. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the backend environment."
    );
    err.statusCode = 503;
    throw err;
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/**
 * Ensure the image bucket exists (public read so stored URLs keep working,
 * writes only possible with the service-role key held by this backend).
 * Idempotent — safe to call before every upload.
 */
async function ensureBucket() {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.getBucket(BUCKET_NAME);
  if (error && error.message && /not found/i.test(error.message)) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5242880, // 5 MB, matches the existing profile-photo limit
    });
    if (createError) throw createError;
    return;
  }
  if (error) throw error;
  void data;
}

/**
 * Generate a safe, collision-free object path:
 *   profile-images/{userId}/{timestamp}-{random}.{ext}
 */
function buildObjectPath(userId, fileName, mimeType) {
  const extMap = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extMap[mimeType] || "bin";
  const base = String(fileName || "image")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 40);
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  return `${userId}/${unique}-${base}.${ext}`;
}

/**
 * Upload a Buffer to Supabase Storage and return its stable public URL.
 * Object layout inside the bucket: {folder}/{userId}/{unique}-{name}.{ext}
 * (avatar uploads use folder = bucket name, so no extra prefix).
 * @returns {Promise<{objectPath: string, publicUrl: string}>}
 */
async function uploadImage({ userId, buffer, mimeType, fileName, folder }) {
  await ensureBucket();
  const supabase = getSupabase();
  const relativePath = buildObjectPath(userId, fileName, mimeType);
  const objectPath =
    folder && folder !== BUCKET_NAME ? `${folder}/${relativePath}` : relativePath;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(objectPath, buffer, {
      contentType: mimeType,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(objectPath);
  return { objectPath, publicUrl: data?.publicUrl };
}

/**
 * Best-effort delete of a previously uploaded object.
 * Only deletes objects that belong to the given user (path starts with userId/).
 * Never throws — cleanup failures must not break the request.
 */
async function deleteObjectIfOwned(objectPath, userId) {
  try {
    if (!objectPath || typeof objectPath !== "string") return;
    if (!objectPath.startsWith(`${userId}/`)) return; // safety: own objects only
    const supabase = getSupabase();
    await supabase.storage.from(BUCKET_NAME).remove([objectPath]);
  } catch (err) {
    console.warn("[supabase] old object cleanup skipped:", err?.message);
  }
}

/**
 * Extract the Supabase object path from a stored public URL, or return null
 * if the URL is not one of ours (e.g. legacy Firebase Storage URLs).
 */
function objectPathFromPublicUrl(url) {
  if (!url || typeof url !== "string") return null;
  const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

module.exports = {
  BUCKET_NAME,
  getSupabase,
  ensureBucket,
  buildObjectPath,
  uploadImage,
  deleteObjectIfOwned,
  objectPathFromPublicUrl,
};
