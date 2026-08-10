// Centralized Firebase client (single app/auth/storage/provider)
//
// This is the SINGLE SOURCE OF TRUTH for Firebase on the frontend.
// - Tries process.env.NEXT_PUBLIC_FIREBASE_* first (production/Vercel).
// - Falls back to the bundled public config so auth/storage always work
//   even when env vars are missing (e.g. local dev).
// - Exports a single `app`, `auth`, `storage`, and `googleProvider`.
//
// NOTE: These are public Firebase web config values (safe to embed).
// They only enable client-side auth/storage; security is enforced server-side
// via Firebase Admin and MongoDB.

import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const FALLBACK_CONFIG = {
  apiKey: "AIzaSyBsX-HgUNXszeOZunFBNbKfaNRxRHwQM80",
  authDomain: "internarea-1c6cd.firebaseapp.com",
  projectId: "internarea-1c6cd",
  storageBucket: "internarea-1c6cd.firebasestorage.app",
  messagingSenderId: "513389242059",
  appId: "1:513389242059:web:a67fa252826af0bb3fdd4e",
  measurementId: "G-JR38XZN5EM",
};

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY || FALLBACK_CONFIG.apiKey,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || FALLBACK_CONFIG.authDomain,
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || FALLBACK_CONFIG.projectId,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    FALLBACK_CONFIG.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    FALLBACK_CONFIG.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || FALLBACK_CONFIG.appId,
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
    FALLBACK_CONFIG.measurementId,
};

console.log("[Firebase Debug]", {
  apiKey: firebaseConfig.apiKey?.slice(0, 10),
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId,
});

// Initialize exactly once.
const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export { firebaseConfig };

export default app;
