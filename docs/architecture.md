# Architecture

## Overview

InternArea is a full-stack internship platform with two independent deployments: a Next.js frontend and an Express backend, backed by MongoDB and Firebase Authentication.

```
┌──────────────┐      HTTPS (Bearer token)     ┌──────────────┐
│  Browser     │  ───────────────────────────► │  Next.js     │
│              │    Axios API calls            │  Frontend    │
│  React UI    │    (with Firebase ID token)   │  (port 3000) │
└──────────────┘                              └──────┬───────┘
                                                      │
                                                      ▼
┌──────────────┐    ID token (JWT)    ┌──────────────┐
│  Firebase    │ ◄──────────────────  │  Express     │
│  Auth        │     verifyIdToken    │  Backend     │
│  (OAuth,     │                      │  (port 5000) │
│   OTP, etc.) │                      └──────┬───────┘
└──────────────┘                             │
         │                                   │ MongoDB queries
         ▼                                   ▼
   ┌──────────┐     ┌──────────────────────────────┐
   │  Users,  │     │  MongoDB Atlas                 │
   │  Tokens │     │  (Job, Internship,             │
   │  Claims │     │   Application, UserProfile,   │
   │  Claims │     │   PublicPost, Notification,   │
   │         │     │   Friendship, Subscription,   │
   │         │     │   Settings, etc.)              │
   └──────────┘     └──────────────────────────────┘
```

## Components

### Frontend (Next.js 15, TypeScript)

- **Framework**: Next.js 15 with the Pages Router (`src/pages/`)
- **State**: Redux Toolkit (`@reduxjs/toolkit`) for user authentication state
- **HTTP**: Axios with a centralized client (`src/lib/axiosClient.ts`) that attaches the Firebase ID token to requests
- **Auth**: Firebase Client SDK (`src/lib/firebase.ts`) — handles email/password, Google sign-in, phone OTP
- **i18n**: Custom runtime i18n engine (`src/i18n/runtime.tsx`) supporting 6 languages (en, es, hi, pt, zh, fr) with English as the source-of-truth fallback
- **UI**: Tailwind CSS + shadcn/ui components + lucide-react icons
- **Realtime**: Socket.IO client for messaging

### Backend (Express 4, Node.js)

- **Framework**: Express 4 with `asyncHandler` wrapper for async route handlers
- **Auth**: Firebase Admin SDK verifies tokens server-side (`middleware/authFirebase.js`)
- **Admin Auth**: Dual-mode authorization — admin session tokens (HMAC-SHA256) or Firebase ID tokens with admin custom claims (`middleware/adminSession.js`)
- **Database**: Mongoose ODM over MongoDB
- **Email**: Resend API (primary) with Nodemailer/SMTP fallback
- **Payments**: Razorpay for subscription billing and invoice generation (PDF via pdfkit)
- **Security**: Helmet (security headers), express-rate-limit, CORS allowlist, body-size limits
- **Realtime**: Socket.IO server for 1-to-1 messaging and notifications

### Database (MongoDB Atlas)

- **Connection**: `MONGODB_URI` (or `DATABASE_URL` fallback) with Mongoose
- **Models**: 22 Mongoose models (see [Database](database.md))
- **Auth delegation**: No password storage — Firebase Auth handles all credential management (bcrypt/scrypt hashing, email verification, OTP)

### External Services

| Service | Purpose |
|---|---|
| Firebase Authentication | User sign-up, sign-in, email verification, phone OTP |
| Firebase Storage | Media/file uploads (chat images, etc.) |
| MongoDB Atlas | Primary data store (user profiles, jobs, applications, posts, etc.) |
| Resend | Transactional email delivery |
| Razorpay | Payment processing and subscription billing |
| Vercel | Frontend deployment |
| Render | Backend deployment |

## Data Flow

### Authenticated User Request

```
Browser ──(getIdToken)──► Firebase Auth
Browser ──(Bearer token in Axios)──► Next.js API / Backend
Backend ──(verifyIdToken)──► Firebase Admin
Backend ──(req.user.uid)──► MongoDB (scoped queries)
```

### Admin Request

```
Browser ──(admin login)──► Backend POST /api/admin/adminlogin
Backend ──(issueAdminSessionToken)──► Browser stores token in localStorage
Browser ──(Bearer token)──► Backend /api/admin/*
Backend ──(verifyAdminSessionToken / verifyIdToken)──► req.user = { isAdmin: true }
Backend ──(req.user)──► MongoDB (admin-scoped queries)
```

## Deployment Architecture

- **Frontend**: Next.js app deployed on Vercel
- **Backend**: Express API deployed on Render (or self-hosted)
- **Database**: MongoDB Atlas (shared cluster)
- **Secrets**: All sensitive values configured via environment variables; Firebase service-account JSON is never committed to source control

## Key Design Decisions

1. **Firebase as the auth boundary**: Passwords, email verification, and OTP are managed by Firebase. The backend never sees or stores passwords.
2. **Server-side identity**: `req.user` is populated only by verified token middleware — never trusted from request bodies.
3. **Admin dual-auth**: Admin panel supports both username/password login (issued HMAC session tokens) and Firebase admin custom claims.
4. **i18n at runtime**: Translations are TypeScript dictionaries loaded synchronously with English fallback. No runtime network requests for locale files.
