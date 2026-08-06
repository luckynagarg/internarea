import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../lib/firebase";

function sanitizeFileName(name) {
  return (name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadMedia(file) {
  if (!file) throw new Error("No file provided");

  const mediaType = file.type?.startsWith("video/") ? "video" : "image";
  const ext = mediaType === "video" ? "mp4" : "jpg";

  const path = `public-space/${Date.now()}-${Math.random().toString(16).slice(2)}-${sanitizeFileName(
    file.name
  )}.${ext}`;

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  return { mediaType, mediaUrl: url };
}
