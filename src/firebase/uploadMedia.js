/**
 * Uploads a file via the authenticated backend endpoint (POST /api/upload).
 *
 * This replaces the old client-side Firebase Storage upload. The backend
 * validates the file, uploads it to Supabase Storage with the service-role
 * key (which NEVER reaches the browser), and returns a public image URL
 * that is persisted in MongoDB by the existing endpoints.
 *
 * The function signature and return shape are UNCHANGED
 * ({ mediaType, mediaUrl }) so all existing callers keep working.
 *
 * @param {File} file - The file to upload
 * @param {number} [timeoutMs=30000] - Timeout in milliseconds (default 30s)
 * @param {{folder?: "profile-images" | "public-space"}} [options]
 * @returns {Promise<{mediaType: string, mediaUrl: string}>}
 */
import axiosClient from "../lib/apiClient";

export async function uploadMedia(file, timeoutMs = 30000, options = {}) {
  if (!file) throw new Error("No file provided");

  // Validate file size (matches the backend's 5 MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`);
  }

  // Validate file type (must match the backend MIME allow-list)
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    throw new Error(
      `Invalid file type: ${file.type}. Allowed types: ${validTypes.join(", ")}`
    );
  }

  const mediaType = file.type?.startsWith("video/") ? "video" : "image";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", options.folder || "profile-images");

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            `Upload timed out after ${timeoutMs / 1000} seconds. Please check your connection and try again.`
          )
        ),
      timeoutMs
    );
  });

  try {
    // Race the upload against the timeout. Override the JSON content-type so
    // axios sets the correct multipart/form-data boundary for FormData.
    const res = await Promise.race([
      axiosClient.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: timeoutMs,
      }),
      timeoutPromise,
    ]);

    const data = res?.data ?? res;
    const mediaUrl = data?.mediaUrl ?? data?.data?.mediaUrl;
    if (!mediaUrl) throw new Error("Upload did not return a URL.");
    return { mediaType, mediaUrl };
  } catch (error) {
    // Provide a useful, non-sensitive error message
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Upload failed. Please try again.";
    throw new Error(message);
  }
}

