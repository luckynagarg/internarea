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

// Request timeout in milliseconds (15 seconds).
const REQUEST_TIMEOUT_MS = 15000;

// Centralized Axios instance.
// - Sets baseURL
// - Adds Authorization header automatically for authenticated users (Firebase ID token)
// - Leaves public endpoints untouched (no Authorization header if user not signed in)
const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
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

// Map HTTP status codes to user-friendly error messages.
// Never expose internal details, stack traces, or sensitive data.
function getErrorMessage(status: number | undefined, fallback: string): string {
  switch (status) {
    case 400:
      return "Invalid request. Please check your input and try again.";
    case 401:
      return "Your session has expired. Please log in again.";
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "This action conflicts with the current state. Please refresh and try again.";
    case 422:
      return "Validation failed. Please check your input.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 502:
    case 503:
      return "Service temporarily unavailable. Please try again shortly.";
    case 500:
    default:
      return fallback;
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
  } catch {
    // If token fetch fails, do not block request; backend will handle it.
  }

  return config;
});

// Centralized response error handler.
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error or request was made but no response received.
    if (error.response) {
      const status = error.response.status;
      const serverMessage = error.response.data?.message || error.response.data?.error?.message;

      // For 401, let the caller handle redirect (avoid loops on public pages).
      // Attach a normalized, user-friendly message to the error.
      const friendlyMessage = getErrorMessage(
        status,
        serverMessage || "Something went wrong. Please try again."
      );

      // Mutate error to include the friendly message while preserving original info.
      error.userMessage = friendlyMessage;
      error.isAuthError = status === 401;
      error.isForbidden = status === 403;
      error.isNotFound = status === 404;
      error.isConflict = status === 409;
      error.isServerError = status >= 500;
      error.statusCode = status;
    } else if (error.request) {
      // Request was sent but no response (network error or timeout).
      if (error.code === "ECONNABORTED") {
        error.userMessage = "Request timed out. Please check your connection and try again.";
      } else {
        error.userMessage = "Connection lost. Check your internet connection and retry.";
      }
      error.isNetworkError = true;
    } else {
      // Something happened in setting up the request.
      error.userMessage = "Something went wrong. Please try again.";
      error.isUnknownError = true;
    }

    return Promise.reject(error);
  }
);

export default axiosClient;

