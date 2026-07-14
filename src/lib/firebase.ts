// Centralized Firebase client (single app/auth/storage/provider)

import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID as string | undefined,
};

function getMissingFirebaseEnvVars(config: Record<string, unknown>) {
  return Object.entries(config)
    .filter(([, v]) => v === undefined || v === "")
    .map(([k]) => k);
}

const missing = getMissingFirebaseEnvVars(firebaseConfig);
const firebaseEnabled = missing.length === 0;

// Avoid crashing during Next.js build/SSG when env vars are not present.
// Runtime pages/components that actually require Firebase will still fail with a clear error when used.
const app = firebaseEnabled
  ? getApps().length
    ? getApps()[0]!
    : initializeApp(firebaseConfig)
  : null;




export const auth = app ? getAuth(app) : (undefined as any);
export const storage = app ? getStorage(app) : (undefined as any);
export const googleProvider = new GoogleAuthProvider();

export default app;


