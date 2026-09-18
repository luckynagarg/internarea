# Deployment

## Architecture Overview

InternArea consists of two independent services deployed on separate platforms:

```
┌─────────────────────────────────────────────────┐
│  Vercel  (Frontend)                              │
│  ┌─────────────────────────────────────┐        │
│  │  Next.js build output (.next)       │        │
│  │  Exposed at https://internarea-...  │        │
│  │  .vercel.app                        │        │
│  └───────────┬───────────────────────────┘        │
└──────────────┼───────────────────────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────────────────────┐
│  Render  (Backend)                             │
│  ┌─────────────────────────────────────┐        │
│  │  Express app (backend/index.js)     │        │
│  │  Exposed at                        │        │
│  │  https://intern-backend-...onrender.│        │
│  │  com                               │        │
│  └───────────┬───────────────────────────┘        │
└──────────────┼───────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│  MongoDB Atlas  (Database)                       │
│  ────────────────────────────────────────┐       │
│  Shared cluster hosting all collections  │       │
└─────────────────────────────────────────────────┘
```

## Frontend Deployment (Vercel)

### Configuration

- **Platform**: Vercel
- **Build command**: `npm run build`
- **Output directory**: `.next`
- **Framework**: Next.js 16 (Pages Router)

### Required Environment Variables (Vercel)

Set these in the Vercel project settings:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase Analytics ID |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public Razorpay key |

These variables are safe to expose client-side (they are public Firebase config values, not secrets).

### Build Considerations

- The `.env.local` file is used for local development and should not be committed
- Firebase credentials have a built-in fallback in `src/lib/firebase.ts`, but production should set all variables explicitly

## Backend Deployment (Render)

### Configuration

- **Platform**: Render (Node.js service)
- **Build command**: `npm install`
- **Start command**: `npm start` (runs `node index.js`)
- **Port**: Configured via `PORT` environment variable (default: 5000)

### Required Environment Variables (Render)

Set these in the Render service environment:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` or `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `FIREBASE_SERVICE_ACCOUNT` | Yes | Full Firebase service-account JSON (preferred) |
| `RESEND_API_KEY` | Yes | Resend email API key |
| `EMAIL_FROM` | Yes | Sender email address |
| `OTP_HMAC_SECRET` | Yes | OTP hashing secret (>= 32 chars) |
| `ADMIN_USER` | Yes | Admin username |
| `ADMIN_PASS` | Yes | Admin password |
| `ADMIN_SESSION_SECRET` | Yes | Admin session HMAC secret (>= 32 chars) |
| `RAZORPAY_KEY_ID` | Yes | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay key secret |
| `CORS_ALLOWED_ORIGINS` | Recommended | Comma-separated frontend origins |

### Optional Environment Variables

| Variable | Description |
|---|---|
| `FRONTEND_URL` | Single frontend origin for CORS |
| `SOCKET_IO_CORS_ORIGIN` | Socket.IO CORS origin |
| `CHAT_MAX_IMAGE_SIZE` | Max upload size (bytes) |
| `ENABLE_PAYMENT_TIME_WINDOW` | Restrict payments to IST business hours |
| `TEST_PASSWORD` | Test account password (for seed scripts only) |

### Render Deployment Steps

1. Fork or connect the repository to Render
2. Create a new "Web Service"
3. Set the root directory to `backend`
4. Set the build command to `npm install`
5. Set the start command to `node index.js`
6. Set all required environment variables
7. Deploy

### Critical Render Notes

**DATABASE_URL Gotcha**: When a Render PostgreSQL database is linked to the service, Render automatically overrides `DATABASE_URL` with a `postgres://` URI. To avoid this conflict, set `MONGODB_URI` to your MongoDB Atlas URI instead — it takes priority over `DATABASE_URL`.

**Firebase Credentials**: Provide `FIREBASE_SERVICE_ACCOUNT` as the full JSON string from the Firebase Console (Project Settings > Service Accounts > Generate new private key), with `\n` escaped in the `private_key` field.

## Database Hosting

- **Provider**: MongoDB Atlas
- **Plan**: M0 (free tier) minimum, M2+ recommended for production
- **Network**: Ensure the backend IP ranges are allowlisted in Atlas
- **Backups**: Atlas automated backups recommended

## CORS Configuration

The backend allows origins from a configurable allowlist. Set `CORS_ALLOWED_ORIGINS` to a comma-separated list of your frontend URLs. If not set, the defaults allow:

- `http://localhost:3000`
- `https://internarea-one.vercel.app`
- `https://internarea-nine.vercel.app`
- `https://internshala-clone-y2p2.onrender.com`

## Production Health Checks

```bash
# Backend health
curl https://<your-backend>.onrender.com/api/health

# Frontend (should return 200)
curl https://<your-frontend>.vercel.app/
```
