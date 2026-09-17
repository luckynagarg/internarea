# Troubleshooting

Common issues encountered during development and deployment, with verified fixes.

---

## Backend Issues

### Problem: 503 Service Unavailable on protected endpoints

**Symptoms**: `GET /api/notifications`, `GET /api/resume/my-resumes`, or `GET /api/login/history` returns 503 with message "Authentication service is not configured."

**Root Cause**: Firebase Admin SDK is not initialized because the `FIREBASE_SERVICE_ACCOUNT` (or individual `FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY`) environment variables are missing or malformed.

**Solution**:
1. Check startup logs for `[startup] Firebase Admin NOT initialized: <reason>`
2. Set `FIREBASE_SERVICE_ACCOUNT` to the full service-account JSON string (with escaped `\n` in `private_key`)
3. Restart the backend

**Verification**: After restart, logs should show `[startup] Firebase Admin: initialized OK`.

---

### Problem: MongoDB connection fails with "Invalid scheme"

**Symptoms**: Backend logs: `DATABASE_URL is not a valid MongoDB connection string` or `Database connection failed: Mongo will be treated as unavailable`

**Root Cause**: `DATABASE_URL` is set to a non-MongoDB URI (e.g. a PostgreSQL URL auto-injected by Render when a PostgreSQL database is linked).

**Solution**:
1. Check the host printed in startup logs: `[startup] Mongo host: <host>`
2. If it's a Postgres host (e.g. `ep-xxx.us-east.aws.render.com`), unlink the Render PostgreSQL database
3. Alternatively, set `MONGODB_URI` to your MongoDB Atlas URI — it takes priority over `DATABASE_URL`

**Verification**: Logs should show `[startup] starts with mongodb+srv:// : true` and `Database is connected`.

---

### Problem: CORS errors in browser

**Symptoms**: Browser console: `Access to fetch at 'https://backend/api/...' from origin 'https://frontend' has been blocked by CORS policy`

**Root Cause**: The frontend origin is not in the backend's allowed origins list.

**Solution**:
1. Set `CORS_ALLOWED_ORIGINS` to a comma-separated list including your frontend URL
2. Or set `FRONTEND_URL` to your frontend origin
3. Restart the backend

**Verification**: The response should include `Access-Control-Allow-Origin` header matching the frontend origin.

---

### Problem: Admin login returns 401

**Symptoms**: `POST /api/admin/adminlogin` returns `{"success": false, "message": "Invalid credentials"}`

**Root Cause**: The `ADMIN_USER` / `ADMIN_PASS` environment variables don't match the submitted credentials, or the DB-stored credential check is failing.

**Solution**:
1. Verify `ADMIN_USER` and `ADMIN_PASS` are set in the backend environment
2. Ensure `ADMIN_SESSION_SECRET` is set (min 32 characters)
3. For DB-stored credentials, verify the `AdminConfig` document exists (set via the password reset flow)

**Verification**: Successful login returns `{"success": true, "data": {"token": "...", "tokenType": "admin-session"}}`.

---

### Problem: 401 on admin API calls after login

**Symptoms**: Admin panel loads but API calls return 401

**Root Cause**: The admin session token in `localStorage` has expired (8-hour TTL) or was cleared.

**Solution**:
1. Log out and log back in via `/adminlogin`
2. Check that the token is stored: `localStorage.getItem('internarea_admin_session_token')`

**Verification**: The token should be a 2-segment string (`payload.signature`), and `GET /api/admin/dashboard/stats` should return 200.

---

## Frontend Issues

### Problem: Firebase auth not working (auth is undefined)

**Symptoms**: Sign-in buttons do nothing, or console shows `Cannot read property 'currentUser' of undefined`

**Root Cause**: The Firebase client config is missing `NEXT_PUBLIC_FIREBASE_*` environment variables.

**Solution**:
1. Ensure all 7 Firebase env vars are set in `.env.local`
2. Copy from `.env.example` and fill in real values from the Firebase Console

**Verification**: Console should log `[Firebase Debug]` with the API key prefix, and the Firebase Auth instance should be defined.

---

### Problem: 404 errors on API calls

**Symptoms**: Frontend shows "Connection lost" or "Not found" errors

**Root Cause**: `NEXT_PUBLIC_API_BASE_URL` points to the wrong backend URL, or the backend is not running.

**Solution**:
1. Verify `NEXT_PUBLIC_API_BASE_URL` in `.env.local` matches the backend URL
2. Ensure the backend is running and reachable
3. Check that the backend route exists (use `GET /api/routes` in development)

**Verification**: `curl <NEXT_PUBLIC_API_BASE_URL>/api/health` should return `{"ok": true}`.

---

### Problem: Build fails with TypeScript errors

**Symptoms**: `npm run build` fails with TS errors (e.g. in admin panel pages)

**Root Cause**: JSX structure is broken — function bodies are split by JSX return statements.

**Solution**: Ensure all function code is above the `return (...)` statement. The JSX should be the last thing in the component function. See the fixed admin panel pages for reference.

**Verification**: `npm run build` completes with no errors.

---

## Deployment Issues

### Problem: Vercel build fails with "Module not found: json-loader"

**Symptoms**: Vercel deployment fails during build with `Cannot find module 'json-loader'`

**Root Cause**: `next.config.ts` had a custom webpack rule for `json-loader` which is not installed and unnecessary (webpack 5 handles JSON natively).

**Solution**: Remove the `json-loader` webpack block from `next.config.ts`. JSON imports work natively in Next.js 15.

**Verification**: Vercel build completes successfully.

---

### Problem: Stale `.next` cache causes file-not-found errors

**Symptoms**: After a failed build, subsequent builds show errors like `Cannot find module '...applications.js'` or `ENOENT rename '.next/...'`

**Root Cause**: The `.next` directory contains partial/stale build artifacts from a previous failed build.

**Solution**:
1. Delete the `.next` directory: `rm -rf .next`
2. Rebuild: `npm run build`

For Vercel: trigger a redeploy with "Clear build cache" from the Vercel dashboard.

---

### Problem: React lint error blocks Vercel build

**Symptoms**: Build fails with `react/no-unescaped-entities` error

**Root Cause**: A literal apostrophe in JSX text (e.g. `don't`) without proper escaping.

**Solution**: Wrap the text in a JSX expression: `{"don't do this"}`

**Verification**: `npm run lint` passes without errors.
