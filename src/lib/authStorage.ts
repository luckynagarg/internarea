/**
 * Auth-storage cleanup helpers.
 *
 * Removes ALL authentication/session related browser storage so the app
 * behaves as if a brand-new user opened it. Deliberately preserves
 * non-auth data such as the language preference ('internarea_lang').
 */
export const REMEMBERED_EMAIL_KEY = "internarea_remembered_email";

/** localStorage/sessionStorage keys that are auth/session related. */
const AUTH_KEY_PREFIXES = ["internarea_"];

/** Keys that must survive an auth reset (not auth data). */
const PRESERVED_KEYS = new Set(["internarea_lang"]);

function isAuthKey(key: string): boolean {
  if (PRESERVED_KEYS.has(key)) return false;
  return AUTH_KEY_PREFIXES.some((p) => key.startsWith(p));
}

/**
 * Clear all auth/session data from localStorage and sessionStorage.
 * Call this on logout (Firebase signOut is handled separately by callers
 * that need the auth instance).
 */
export function clearAuthStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const lsKeys = Object.keys(window.localStorage);
    lsKeys.filter(isAuthKey).forEach((k) => window.localStorage.removeItem(k));
    const ssKeys = Object.keys(window.sessionStorage);
    ssKeys.filter(isAuthKey).forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    // Storage may be unavailable (private mode) — ignore.
  }
}

/**
 * Full auth reset: clears browser storage. Firebase signOut + Redux reset
 * are done by the caller (which owns those instances).
 */
export function resetAuthData(): void {
  clearAuthStorage();
}
