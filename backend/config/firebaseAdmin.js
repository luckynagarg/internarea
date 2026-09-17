const {
  initializeApp,
  getApps,
  cert,
} = require("firebase-admin/app");

const fs = require("fs");
const path = require("path");

/**
 * Parse Firebase service-account JSON.
 *
 * Supports:
 * 1. Normal JSON
 * 2. JSON stored inside Render environment variables
 * 3. Escaped \n characters inside private_key
 */
function parseServiceAccount(raw) {
  if (!raw) {
    return null;
  }

  // If an object is already provided
  if (typeof raw === "object") {
    return raw;
  }

  const value = String(raw).trim();

  if (!value) {
    return null;
  }

  // First try normal JSON.
  try {
    return JSON.parse(value);
  } catch (firstError) {
    // If private_key contains escaped newlines,
    // convert literal \n into real newline characters.
    try {
      const normalized = value.replace(/\\n/g, "\n");
      return JSON.parse(normalized);
    } catch (secondError) {
      throw new Error(
        "[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT is not valid JSON."
      );
    }
  }
}

/**
 * Validate Firebase service-account credentials.
 */
function validateServiceAccount(account) {
  if (!account || typeof account !== "object") {
    throw new Error(
      "[firebaseAdmin] Firebase service account must be a JSON object."
    );
  }

  const missing = [];

  if (!account.project_id) {
    missing.push("project_id");
  }

  if (!account.client_email) {
    missing.push("client_email");
  }

  if (!account.private_key) {
    missing.push("private_key");
  }

  if (missing.length > 0) {
    throw new Error(
      `[firebaseAdmin] Firebase service account is missing: ${missing.join(
        ", "
      )}`
    );
  }

  return {
    project_id: account.project_id,
    client_email: account.client_email,
    private_key: String(account.private_key).replace(/\\n/g, "\n"),
  };
}

/**
 * Load Firebase service-account JSON from a file.
 *
 * Mainly useful for local development.
 * Render production should preferably use
 * FIREBASE_SERVICE_ACCOUNT.
 */
function loadServiceAccountFromFile() {
  const configuredPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!configuredPath) {
    return null;
  }

  let filePath = String(configuredPath).trim();

  // Resolve relative paths from backend root.
  if (!path.isAbsolute(filePath)) {
    filePath = path.resolve(__dirname, "..", filePath);
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT_PATH points to a missing file: ${filePath}`
    );
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);

    return validateServiceAccount(parsed);
  } catch (error) {
    if (error?.message?.startsWith("[firebaseAdmin]")) {
      throw error;
    }

    throw new Error(
      "[firebaseAdmin] Firebase service-account file contains invalid JSON."
    );
  }
}

/**
 * Get Firebase Admin credentials.
 *
 * Priority:
 *
 * 1. FIREBASE_SERVICE_ACCOUNT
 * 2. FIREBASE_SERVICE_ACCOUNT_PATH
 * 3. Individual environment variables
 */
function getFirebaseCredentials() {
  // =========================================================
  // OPTION 1
  // Complete Firebase JSON from Render environment
  // =========================================================

  const serviceAccountJson =
    process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountJson) {
    const parsed = parseServiceAccount(serviceAccountJson);

    return validateServiceAccount(parsed);
  }

  // =========================================================
  // OPTION 2
  // Firebase JSON file
  // =========================================================

  const fromFile = loadServiceAccountFromFile();

  if (fromFile) {
    return fromFile;
  }

  // =========================================================
  // OPTION 3
  // Individual environment variables
  // =========================================================

  const projectId =
    process.env.FIREBASE_PROJECT_ID;

  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL;

  let privateKey =
    process.env.FIREBASE_PRIVATE_KEY;

  const missing = [];

  if (!projectId) {
    missing.push("FIREBASE_PROJECT_ID");
  }

  if (!clientEmail) {
    missing.push("FIREBASE_CLIENT_EMAIL");
  }

  if (!privateKey) {
    missing.push("FIREBASE_PRIVATE_KEY");
  }

  if (missing.length > 0) {
    throw new Error(
      `[firebaseAdmin] Missing Firebase credentials: ${missing.join(
        ", "
      )}`
    );
  }

  // Convert literal \n into actual newlines.
  privateKey = privateKey.replace(/\\n/g, "\n");

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  };
}

/**
 * Initialize Firebase Admin exactly once.
 */
function initFirebaseAdmin() {
  // Prevent duplicate initialization.
  const apps = getApps();

  if (apps.length > 0) {
    return apps[0];
  }

  // Get credentials.
  const credentials = getFirebaseCredentials();

  // Initialize Firebase Admin.
  // Never log credentials or private_key.
  return initializeApp({
    credential: cert(credentials),
  });
}

/**
 * Return Firebase Admin app.
 *
 * Throws a clear error if Firebase
 * configuration is missing or invalid.
 */
function getAdminOrThrow() {
  try {
    return initFirebaseAdmin();
  } catch (error) {
    throw new Error(
      error?.message ||
        "[firebaseAdmin] Firebase Admin initialization failed."
    );
  }
}

/**
 * Return the Firebase Auth service (firebase-admin v14+ API).
 *
 * From firebase-admin v14 the legacy `admin.auth()` on the App object is no
 * longer available. All callers must use the dedicated `getAuth()` helper from
 * "firebase-admin/auth" instead.
 *
 * This ensures the default app is initialized exactly once before returning the
 * Auth service, so it is safe to call from any route/service.
 */
function getAuthOrThrow() {
  getAdminOrThrow();
  // Import lazily so we never require the auth subpackage at module load time.
  const { getAuth } = require("firebase-admin/auth");
  return getAuth();
}

module.exports = {
  initFirebaseAdmin,
  getAdminOrThrow,
  getAuthOrThrow,
};