// Re-export centralized Firebase client from src/lib/firebase.ts
// This file intentionally contains NO Firebase initialization.

export { auth } from "../src/lib/firebase";
export { googleProvider as GoogleAuthProvider } from "../src/lib/firebase";

