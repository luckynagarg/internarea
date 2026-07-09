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

function assertConfig(config: Record<string, unknown>) {
  const missing = Object.entries(config)
    .filter(([, v]) => v === undefined || v === "")
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(
      `Missing Firebase env vars: ${missing.join(", ")}. Please set them in .env.local.`
    );
  }
}

assertConfig(firebaseConfig);

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);



export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;

