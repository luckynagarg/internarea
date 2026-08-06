// Legacy re-export to preserve compatibility with existing imports.
// The single source of truth is now src/lib/firebase.ts.
// Keep this file so `@/firebase/firebase` imports continue to work.

import app, { auth, storage, googleProvider, firebaseConfig } from "../lib/firebase";

export { auth, storage, googleProvider, firebaseConfig };
export const provider = googleProvider;

export default app;
