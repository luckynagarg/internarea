# Environment Variables

This document lists all environment variables used by the InternArea project. Variables are grouped by component.

## Variable Naming Convention

- `NEXT_PUBLIC_*`: Exposed to the browser (safe to embed; these are public config only)
- Unprefixed variables: Server-only (never exposed to the client)

---

## Frontend (`internarea/`)

### `.env.local`

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Base URL for the backend API (e.g. `https://your-backend.onrender.com` or `http://localhost:5000`) |

### `.env.example`

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase web API key (public) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain (e.g. `project.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase web app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Yes | Firebase Analytics Measurement ID |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Backend API base URL |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes | Public Razorpay key for subscription checkout |

> The Firebase client config in `src/lib/firebase.ts` has a built-in fallback to a default development config, so the app will build and load even without env vars set. Authentication will not work without the correct values.

---

## Backend (`backend/`)

### MongoDB

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | MongoDB connection string. Must start with `mongodb://` or `mongodb+srv://`. |
| `MONGODB_URI` | No | Takes priority over `DATABASE_URL` if both are set. |
| `MONGO_URL` | No | Lower priority fallback. |
| `MONGO_URI` | No | Lowest priority fallback. |

### Server

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Port to listen on (default: 5000) |
| `NODE_ENV` | No | `development` or `production` |

### Firebase Admin

**Provide exactly one of the following three options:**

| Variable | Option | Description |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Option 1 | Full service-account JSON string (with escaped `\n` in `private_key`) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Option 2 | Path to a service-account JSON file (local dev only) |
| `FIREBASE_PROJECT_ID` | Option 3a | Project ID portion of individual credentials |
| `FIREBASE_CLIENT_EMAIL` | Option 3b | Client email from the service account |
| `FIREBASE_PRIVATE_KEY` | Option 3c | Private key with escaped `\n` newlines |

### Email (Resend)

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | Yes | Resend API key (`re_...`) |
| `EMAIL_FROM` | Yes | Sender email address |
| `EMAIL_FROM_NAME` | No | Display name for the sender (default: `InternArea`) |

### SMTP Fallback (Gmail)

| Variable | Required | Description |
|---|---|---|
| `SMTP_HOST` | No | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | No | SMTP port (e.g. 587) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password or app password |
| `SMTP_FROM_EMAIL` | No | Fallback from email address |

### OTP HMAC

| Variable | Required | Description |
|---|---|---|
| `OTP_HMAC_SECRET` | Yes | Long random string used to HMAC-hash OTP values before storage |

### Payments (Razorpay)

| Variable | Required | Description |
|---|---|---|
| `RAZORPAY_KEY_ID` | Yes | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay key secret |
| `RAZORPAY_CURRENCY` | No | Currency code (default: `INR`) |
| `RESUME_PRICE_INR` | No | Price for resume creation in INR |

### Admin

| Variable | Required | Description |
|---|---|---|
| `ADMIN_USER` | Yes | Admin username for panel login |
| `ADMIN_PASS` | Yes | Admin password (min 8 chars) |
| `ADMIN_EMAIL` | No | Admin contact email |
| `ADMIN_NAME` | No | Admin display name |
| `ADMIN_SESSION_SECRET` | Yes | HMAC secret for admin session tokens (min 32 chars) |

### Payment Time Window (IST)

| Variable | Required | Description |
|---|---|---|
| `ENABLE_PAYMENT_TIME_WINDOW` | No | `true` to restrict paid activation to a time window |
| `PAYMENT_TIMEZONE` | No | Timezone for daily limits (default: `Asia/Kolkata`) |
| `PAYMENT_ALLOWED_START_HOUR_IST` | No | Start hour (IST) for payment window |
| `PAYMENT_ALLOWED_END_HOUR_IST` | No | End hour (IST) for payment window |

### CORS

| Variable | Required | Description |
|---|---|---|
| `FRONTEND_URL` | No | Single frontend origin for CORS |
| `CORS_ORIGIN` | No | Alternative single frontend origin |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated list of allowed origins (takes precedence) |
| `SOCKET_IO_CORS_ORIGIN` | No | CORS origin for Socket.IO |

### File Uploads

| Variable | Required | Description |
|---|---|---|
| `CHAT_MAX_IMAGE_SIZE` | No | Max image size in bytes for chat uploads (default: 5242880) |
| `CHAT_UPLOAD_DIR` | No | Directory for uploaded chat images (default: `uploads/chat-images`) |

### Test User

| Variable | Required | Description |
|---|---|---|
| `TEST_PASSWORD` | No | Password for the test account created by `backend/scripts/create-test-user.js` |

---

## Environment File Location

| Component | File |
|---|---|
| Backend | `backend/.env` (create from `backend/.env.example`) |
| Frontend | `internarea/.env.local` (create from `internarea/.env.example`) |

Neither `.env` files are tracked in git. See `.gitignore` for details.
