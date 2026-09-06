import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../lib/firebase";

function sanitizeFileName(name) {
  return (name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Uploads a file to Firebase Storage with timeout protection.
 * @param {File} file - The file to upload
 * @param {number} [timeoutMs=30000] - Timeout in milliseconds (default 30s)
 * @returns {Promise<{mediaType: string, mediaUrl: string}>}
 */
export async function uploadMedia(file, timeoutMs = 30000) {
  if (!file) throw new Error("No file provided");

  // Validate file size (max 10MB for images, 50MB for videos)
  const maxSize = file.type?.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`);
  }

  // Validate file type
  const validImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"];
  const validVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];
  const validTypes = [...validImageTypes, ...validVideoTypes];

  if (!validTypes.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed types: ${validTypes.join(", ")}`);
  }

  const mediaType = file.type?.startsWith("video/") ? "video" : "image";
  const ext = mediaType === "video" ? "mp4" : "jpg";

  const path = `public-space/${Date.now()}-${Math.random().toString(16).slice(2)}-${sanitizeFileName(
    file.name
  )}.${ext}`;

  const storageRef = ref(storage, path);

  // Create a timeout promise that rejects after timeoutMs
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Upload timed out after ${timeoutMs / 1000} seconds. Please check your connection and try again.`)), timeoutMs);
  });

  try {
    // Race the upload against the timeout
    await Promise.race([
      uploadBytes(storageRef, file),
      timeoutPromise,
    ]);

    const url = await getDownloadURL(storageRef);
    return { mediaType, mediaUrl: url };
  } catch (error) {
    // Provide more specific error messages
    if (error.code === "storage/unauthorized") {
      throw new Error("Upload failed: Not authorized. Please sign in and try again.");
    } else if (error.code === "storage/canceled") {
      throw new Error("Upload was cancelled.");
    } else if (error.code === "storage/quota-exceeded") {
      throw new Error("Upload failed: Storage quota exceeded. Please contact support.");
    } else if (error.code === "storage/invalid-checksum") {
      throw new Error("Upload failed: File corrupted. Please try again.");
    } else if (error.code === "storage/retry-limit-exceeded") {
      throw new Error("Upload failed: Network error. Please check your connection and try again.");
    }
    throw error;
  }
}
