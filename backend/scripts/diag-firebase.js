/**
 * Diagnostic script to test Firebase Admin initialization & connectivity.
 * Never logs secrets/private keys. Only logs safe metadata.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

async function main() {
  console.log("== Firebase Admin Diagnostics ==");
  console.log("FIREBASE_SERVICE_ACCOUNT present:", !!process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log("FIREBASE_SERVICE_ACCOUNT_PATH present:", !!process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  console.log("FIREBASE_PROJECT_ID present:", !!process.env.FIREBASE_PROJECT_ID);
  console.log("FIREBASE_CLIENT_EMAIL present:", !!process.env.FIREBASE_CLIENT_EMAIL);
  console.log("FIREBASE_PRIVATE_KEY present:", !!process.env.FIREBASE_PRIVATE_KEY);
  console.log("");

  const { getAdminOrThrow } = require("../config/firebaseAdmin");
  const fs = require("fs");
  const path = require("path");

  // 1. Try to init admin.
  let app;
  try {
    app = getAdminOrThrow();
    console.log("[OK] Firebase Admin initialized.");
  } catch (e) {
    console.error("[FAIL] Firebase Admin init failed:", e.message);
    return;
  }

  // 2. Determine project id from the loaded credentials vs env.
  const account = (() => {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (raw) {
        try { return JSON.parse(raw.replace(/\\n/g, "\n")); } catch { return JSON.parse(raw); }
      }
      const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      if (p) {
        let fp = p;
        if (!path.isAbsolute(fp)) fp = path.join(__dirname, "..", fp);
        return JSON.parse(fs.readFileSync(fp, "utf8"));
      }
    } catch (e) {}
    return null;
  })();

  if (account) {
    console.log("[info] Loaded service account project_id:", account.project_id);
    console.log("[info] Loaded service account client_email:", account.client_email);
  }

  // 3. Test auth service connectivity (proves the service account has valid
  //    credentials & correct project with Firebase Auth enabled).
  try {
    const { getAuth } = require("firebase-admin/auth");
    const auth = getAuth(app);
    const list = await auth.listUsers(1);
    console.log("[OK] getAuth listUsers succeeded. Total response received. First user present:",
      list.users.length > 0);
  } catch (e) {
    console.error("[FAIL] getAuth / listUsers failed:", e.code || "", e.message);
  }
}

main().catch((e) => {
  console.error("Unexpected error:", e.message);
  process.exit(1);
});

