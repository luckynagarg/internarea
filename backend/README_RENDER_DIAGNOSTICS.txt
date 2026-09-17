Render diagnostics checklist:

1) Verify backend root is reachable:
   GET https://internshala-clone-y2p2.onrender.com/

2) Verify API base routes:
   GET https://internshala-clone-y2p2.onrender.com/api/health
   GET https://internshala-clone-y2p2.onrender.com/api/routes

3) Verify job/internship:
   GET https://internshala-clone-y2p2.onrender.com/api/job
   GET https://internshala-clone-y2p2.onrender.com/api/internship

If /api/routes is 404, Render is not running the expected backend code.
If /api/routes works but /api/job is 404, routing is different (mount path mismatch) and we’ll patch mount/router accordingly.

4) Diagnose 500s on protected endpoints:
   GET /api/notifications
   GET /api/resume/my-resumes
   GET /api/login/history

   These all require the verifyFirebaseIdToken middleware. If any of them return
   500 (or now 503 after the hardening fix), the likely cause is missing Firebase
   Admin credentials on Render.

   With the hardening fix deployed:
   - If Firebase Admin cannot initialize -> returns 503 with
     "Authentication service is not configured. Contact the administrator."
   - If the token is invalid/missing -> returns 401.
   - If MongoDB is not connected -> the DB query inside the route throws (500).

   Check the Render startup logs for these new lines:
   - "[startup] Firebase Admin: initialized OK" (good)
   - "[startup] Firebase Admin NOT initialized: <reason>" (bad - fix env vars)
   - "[startup] MongoDB is NOT available..." (bad - fix DATABASE_URL)

Root cause fix (set these env vars on Render):
   Either a single FIREBASE_SERVICE_ACCOUNT (raw JSON), OR:
   - FIREBASE_PROJECT_ID
   - FIREBASE_CLIENT_EMAIL
   - FIREBASE_PRIVATE_KEY (escaped \n supported)
   Plus DATABASE_URL for MongoDB.

See RENDER_ENV_VARS.md for full details.

