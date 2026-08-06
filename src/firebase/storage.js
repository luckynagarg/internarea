// Legacy re-export to preserve compatibility with existing imports.
// The single source of truth is now src/lib/firebase.ts.
// Keep this file so `@/firebase/storage` imports continue to work.

import { storage } from "../lib/firebase";

export { storage };

export default storage;
