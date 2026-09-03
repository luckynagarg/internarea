import { auth } from "@/lib/firebase";
import { ADMIN_SESSION_TOKEN_KEY } from "@/lib/authStorage";

export async function getAuthToken(): Promise<string | null> {
  try {
    const currentUser = auth?.currentUser;
    if (!currentUser) return null;
    return await currentUser.getIdToken();
  } catch {
    return null;
  }
}

/**
 * Returns auth headers for API requests.
 *
 * Priority:
 * 1. Admin session token (username/password admin login) — no Firebase user
 * 2. Firebase ID token (regular user login)
 *
 * Admin session tokens are server-signed, short-lived HMAC tokens that the
 * /api/admin/* routes accept alongside Firebase tokens.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  // 1. Admin session token (username/password admin login)
  try {
    if (typeof window !== "undefined") {
      const adminToken = window.localStorage.getItem(ADMIN_SESSION_TOKEN_KEY);
      if (adminToken) {
        return { Authorization: `Bearer ${adminToken}` };
      }
    }
  } catch {
    // Storage unavailable — fall through to Firebase
  }

  // 2. Firebase ID token (regular user login)
  const token = await getAuthToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

