# Complete Environment Variable Audit

Audit date: current session
Scope: `intern/backend` (Node/Express/Mongoose/Firebase Admin) + `intern/internarea` (Next.js 15)

Method: compared (a) every `process.env.*` reference in project source code, (b) `.env.example` docs,
and (c) actual `.env` / `.env.local` keys. Secret values were NOT read or logged.

---

## 1. BACKEND — `intern/backend`

### 1a. Env vars referenced in backend source code

| Variable | Used by | Status |
|---|---|---|
| `DATABASE_URL` | `db.js` | ✅ present in `.env` |
| `PORT` | `index.js` | ✅ present in `.env` (default 5000) |
| `FIREBASE_SERVICE_ACCOUNT` | `config/firebaseAdmin.js` | ❌ **MISSING** |
| `FIREBASE_PROJECT_ID` | `config/firebaseAdmin.js` | ❌ **MISSING** |
| `FIREBASE_CLIENT_EMAIL` | `config/firebaseAdmin.js` | ❌ **MISSING** |
| `FIREBASE_PRIVATE_KEY` | `config/firebaseAdmin.js` | ❌ **MISSING** |
| `RESEND_API_KEY` | `services/emailService.js` | ✅ present in `.env` |
| `EMAIL_FROM` | `services/emailService.js` | ❌ **MISSING** |
| `EMAIL_FROM_NAME` | `services/emailService.js` | ❌ **MISSING** |
| `OTP_HMAC_SECRET` | `services/loginSecurityService.js`, `resumeService.js`, `otpEmailService.js` | ❌ **MISSING** |
| `RAZORPAY_KEY_ID` | `services/razorpayService.js`, `razorpaySubscriptionService.js` | ❌ **MISSING** |
| `RAZORPAY_KEY_SECRET` | `services/razorpaySubscriptionService.js`, `Routes/resumeCreation.js` | ❌ **MISSING** |
| `RAZORPAY_CURRENCY` | `resumeCreation.js` | ❌ **MISSING** (defaults INR) |
| `FRONTEND_URL` | `index.js` (CORS) | ❌ **MISSING** (fallback used) |
| `CORS_ORIGIN` | `index.js` (CORS) | ❌ **MISSING** (fallback used) |
| `CORS_ALLOWED_ORIGINS` | `index.js` (CORS) | ❌ **MISSING** (fallback used) |
| `ADMIN_USER` | admin routes | ❌ **MISSING** |
| `ADMIN_PASS` | admin routes | ❌ **MISSING** |
| `ADMIN_EMAIL` | admin routes | ❌ **MISSING** |
| `ADMIN_NAME` | admin routes | ❌ **MISSING** |
| `NODE_ENV` | `index.js` | ❌ **MISSING** (defaults development) |

### 1b. Critical finding — WRONG FIREBASE VAR NAME

The backend `.env` contains:
```
FIREBASE_SERVICE_ACCOUNT_PATH
```
But `config/firebaseAdmin.js` reads:
```js
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
```
`FIREBASE_SERVICE_ACCOUNT_PATH` is **never read by any code**. This is the direct cause of:

> `[authFirebase] Firebase Admin not initialized: Missing required Firebase Admin credentials in env.`
> → `503 Service Unavailable` on protected endpoints.

**Fix:** Either
- Set `FIREBASE_SERVICE_ACCOUNT` to the **full JSON string** of the service account (with escaped `\n` in the private key), OR
- Set the three individual vars: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (private key with escaped `\n`).

`FIREBASE_SERVICE_ACCOUNT_PATH` (path to a file) is **not supported** by the current code.

### 1c. `.env.example` mismatch

- `.env.example` documents `MONGO_URI`, but `db.js` reads `DATABASE_URL`.
- `.env.example` is missing the Firebase vars entirely.

---

## 2. FRONTEND — `intern/internarea`

### 2a. Env vars referenced in frontend source code

| Variable | Used by | Status |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `src/lib/firebase.ts` | ❌ **MISSING** |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `src/lib/firebase.ts` | ❌ **MISSING** |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `src/lib/firebase.ts` | ❌ **MISSING** |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `src/lib/firebase.ts` | ❌ **MISSING** |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `src/lib/firebase.ts` | ❌ **MISSING** |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `src/lib/firebase.ts` | ❌ **MISSING** |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | `src/lib/firebase.ts` | ❌ **MISSING** |
| `NEXT_PUBLIC_API_BASE_URL` | pages (axios) | ✅ present in `.env.local` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | subscription pages | ✅ present in `.env` |
| `NEXT_PUBLIC_API_BASE` | some pages | ❌ not set (fallback localhost:5000) |
| `NEXT_PUBLIC_API_URL` | some pages | ❌ not set (fallback localhost:5000) |
| `NEXT_PUBLIC_BACKEND_URL` | some pages | ❌ not set (fallback localhost:5000) |

### 2b. Critical finding — Firebase client config has NO credentials

`src/lib/firebase.ts` builds the config from the 7 `NEXT_PUBLIC_FIREBASE_*` vars. If any are missing:
- `firebaseEnabled` = false
- `auth` = `undefined`
- `storage` = `undefined`

Pages that import `auth` from `@/lib/firebase` (login, navbar, OTP, profile, verify-email, etc.) will crash or be non-functional at runtime even though the build succeeds.

---

## 3. Consolidated Action List

### Backend (.env on Render + local)
1. Replace `FIREBASE_SERVICE_ACCOUNT_PATH` with either:
   - `FIREBASE_SERVICE_ACCOUNT=<full service-account JSON>` OR
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (escaped `\n`)
2. Add `EMAIL_FROM` (e.g., `no-reply@yourdomain.com`)
3. Add `EMAIL_FROM_NAME`
4. Add `OTP_HMAC_SECRET` (long random string)
5. Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
6. Add `NODE_ENV=production` on Render
7. (Optional) `CORS_ALLOWED_ORIGINS` = comma-separated frontend origins
8. `MONGO_URI` in `.env.example` should be renamed to `DATABASE_URL` to match `db.js`.

### Frontend (Vercel + local)
1. Set all 7 `NEXT_PUBLIC_FIREBASE_*` vars (required for auth to work).
2. Set `NEXT_PUBLIC_API_BASE_URL` to the deployed HTTPS backend.
3. `NEXT_PUBLIC_RAZORPAY_KEY_ID` is already set locally; ensure it's on Vercel too.

---

## 4. Verification commands (keys only, no secrets)

```powershell
# List keys in .env.example
Get-Content intern/backend/.env.example | Select-String '^[A-Za-z_][A-Za-z0-9_]*='

# Scan for process.env in source (excludes node_modules)
Get-ChildItem intern/backend, intern/internarea/src -Recurse -File |
  Where-Object { $_.Extension -in '.js','.ts','.tsx' -and $_.FullName -notmatch 'node_modules' } |
  Select-String 'process\.env\.[A-Za-z0-9_]+' -AllMatches |
  ForEach-Object { $_.Matches.Value } | Sort-Object -Unique
```

