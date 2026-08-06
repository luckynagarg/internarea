import axios from "axios";
import { auth } from "@/lib/firebase";

// NOTE: auth.currentUser can be briefly null right after sign-in/refresh.
// We therefore attach a token only when a Firebase user is actually present.
// This avoids 401 loops for unauthenticated/demo requests (e.g. mock users).

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:5000";

// Centralized Axios instance.
// - Sets baseURL
// - Adds Authorization header automatically for authenticated users (Firebase ID token)
// - Leaves public endpoints untouched (no Authorization header if user not signed in)
const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

async function getTokenSafely(): Promise<string | null> {
  try {
    const currentUser = auth?.currentUser;
    if (!currentUser) return null;
    return await currentUser.getIdToken();
  } catch {
    return null;
  }
}

axiosClient.interceptors.request.use(async (config) => {
  try {
    // Support per-request opt-out (public endpoints, demo endpoints).
    const skipAuth = (config as any)?.skipAuth === true;

    if (skipAuth) {
      return config;
    }

    const token = await getTokenSafely();

    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    // If no token (signed out / demo user), DO NOT attach an Authorization
    // header. Backend will return 401, and callers are expected to fall back
    // to mock data instead of retrying endlessly.
  } catch (e) {
    // If token fetch fails, do not block request; backend will handle it.
  }

  return config;
});

export default axiosClient;

