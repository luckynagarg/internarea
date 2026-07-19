import axios from "axios";
import { auth } from "@/firebase/firebase";

// NOTE: auth.currentUser can be briefly null right after sign-in/refresh.
// We therefore wait for currentUser in the interceptor before attaching a token.


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

function waitForCurrentUser(timeoutMs = 5000): Promise<any> {
  return new Promise((resolve) => {
    const user = auth?.currentUser;
    if (user) return resolve(user);

    const start = Date.now();
    const interval = setInterval(() => {
      const u = auth?.currentUser;
      if (u) {
        clearInterval(interval);
        return resolve(u);
      }
      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        return resolve(undefined as any);
      }
    }, 100);
  });
}

axiosClient.interceptors.request.use(async (config) => {
  // High-signal log to prove interceptor execution for protected requests.
  // eslint-disable-next-line no-console
  console.log('[axiosClient][request] interceptor fired', config?.url);

  try {
    const currentUser = await waitForCurrentUser(5000);

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[axiosClient][request] url:', config?.url);
      // eslint-disable-next-line no-console
      console.debug('[axiosClient][request] auth.currentUser available:', !!currentUser);
    }

    // Log whether Authorization is already present before we attach anything.
    const existingAuthHeader = (config.headers as any)?.Authorization;
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug(
        '[axiosClient][request] Authorization header exists before attach:',
        !!existingAuthHeader
      );
      // eslint-disable-next-line no-console
      console.debug(
        '[axiosClient][request] Authorization header prefix:',
        typeof existingAuthHeader === 'string'
          ? existingAuthHeader.slice(0, 12)
          : null
      );
    }

    if (!currentUser) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug(
          '[axiosClient][request] skipping token attach because currentUser is null'
        );
      }
      return config;
    }

    const token = await currentUser.getIdToken();

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[axiosClient][request] idToken length:', token?.length || 0);
    }

    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;

      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('[axiosClient][request] Authorization header set:', true);
        // eslint-disable-next-line no-console
        console.debug(
          '[axiosClient][request] Authorization header final prefix:',
          `Bearer ${token.slice(0, 10)}...`
        );
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[axiosClient][request] token attach failed:', (e as any)?.message || e);
    }
    // If token fetch fails, do not block request; backend will return 401 with clear message.
  }

  // Log Authorization header immediately before returning config.
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug(
      '[axiosClient][request] Authorization exists on returned config:',
      !!(config.headers as any)?.Authorization
    );
  }

  return config;
});

export default axiosClient;


