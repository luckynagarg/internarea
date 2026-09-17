# Authentication

InternArea uses **Firebase Authentication** as the sole identity provider. Passwords are never stored or hashed by the application backend — all credential management is delegated to Firebase Auth.

## User Roles

| Role | Description |
|---|---|
| **Regular User** | Authenticated via Firebase ID token. Can browse jobs/internships, apply, post in Public Space, send messages, etc. |
| **Admin** | Authenticated via admin session token (username/password) or Firebase custom claims. Access to `/adminpanel/*` and `/api/admin/*` endpoints. |

Admin access is **never** determined by frontend state alone — every admin API endpoint re-verifies the caller server-side.

## Authentication Methods

### Regular Users

- **Email / Password**: Standard Firebase email/password sign-in
- **Google Sign-in**: OAuth via `GoogleAuthProvider`
- **Phone OTP**: Firebase Phone Auth for mobile login
- **Email Verification**: Firebase's built-in email verification link flow
- **Password Recovery**: Reset password via OTP sent to email

### Admin

- **Username / Password**: Admin credentials are provided via environment variables (`ADMIN_USER`, `ADMIN_PASS`) or a database-stored bcrypt hash (`AdminConfig` model). The `/api/admin/adminlogin` endpoint validates these and issues a signed session token.

## Token Handling

### Frontend

The centralized Axios client (`src/lib/axiosClient.ts`) automatically attaches the Firebase ID token to outgoing requests:

```typescript
// Automatically attaches Bearer token to API calls
axiosClient.get("/api/job");
```

For admin requests, `src/lib/authHeaders.ts` prefers the admin session token from `localStorage` over the Firebase token.

### Backend

```
Bearer <token>
```

- **3-segment JWT**: Treated as a Firebase ID token, verified via `firebase-admin`'s `verifyIdToken()`.
- **2-segment token**: Treated as a server-signed admin session token, verified via HMAC-SHA256.

## Authentication Flow

```
┌──────────────────┐        ┌──────────────────┐
│  User visits     │        │  App loads       │
│  /login          │        │  (_app.tsx)      │
└──────────────────┘        └─────────┬────────┘
                                      │
                                      ▼
          ┌──────────────────┐  Firebase onAuthStateChanged listener
          │  User signs in   │  dispatches Redux login action
          │  (email/Google/  │
          │   phone OTP)     │
          └─────────┬────────┘
                    │
                    ▼
   Firebase ID token issued
                    │
                    ▼
          ┌──────────────────┐
          │  API calls use   │
          │  Bearer token    │
          └─────────┬────────┘
                    │
                    ▼
          ┌──────────────────┐
          │  Backend verifies│
          │  token server-  │
          │  side via Admin  │
          └──────────────────┘
```

## Protected Routes

### Frontend Route Protection

The `_app.tsx` component hides the Navbar and Footer on auth and admin routes. Page-level guards redirect unauthenticated users:

- `/dashboard` — requires a signed-in Firebase user
- `/profile` — requires a signed-in Firebase user
- `/adminpanel/*` — guarded by `AdminLayout`, which checks for an admin session token in `localStorage` and redirects to `/adminlogin` if absent

### Backend Route Protection

| Middleware | File | Purpose |
|---|---|---|
| `verifyFirebaseIdToken` | `middleware/authFirebase.js` | Verifies Firebase ID token, attaches `req.user` |
| `requireAdminAccess` | `middleware/adminSession.js` | Accepts admin session token OR Firebase token + admin claim |
| `requireAdmin` | `middleware/requireAdmin.js` | Checks that `req.user` has an admin claim |

All `/api/admin/*` routes (except `/api/admin/adminlogin`) are protected by `requireAdminAccess`. All user-facing auth-protected routes use `verifyFirebaseIdToken`.

## Admin Authentication Details

### Session Token Flow

1. Admin submits username/password to `POST /api/admin/adminlogin`
2. Backend validates against env vars or DB hash (bcrypt)
3. Backend issues an HMAC-SHA256 signed session token (8-hour TTL)
4. Token is stored in `localStorage` under key `internarea_admin_session_token`
5. Frontend sends the token as `Authorization: Bearer <token>`

### Session Token Verification

The token format is `base64url(payload).base64url(hmac)` (2 segments), distinguishable from Firebase JWTs (3 segments). The backend verifies:

- The HMAC signature matches
- The token has not expired
- The subject matches `ADMIN_USER`

### Logout

Admin logout calls `clearAuthStorage()` (`src/lib/authStorage.ts`) which removes all `internarea_*` keys from `localStorage` and `sessionStorage`, except the language preference (`internarea_lang`).

## Session Persistence

| Session Type | Mechanism |
|---|---|
| Regular user | Firebase handles persistence (localStorage by default) |
| Admin session | `localStorage` key `internarea_admin_session_token`, 8-hour TTL |

## Security Measures

- **Server-side token verification**: All auth decisions are made server-side. The backend never trusts `req.body` for user identity.
- **Admin session tokens**: Signed with HMAC-SHA256 using a 32+ character secret; cannot be forged.
- **Admin self-deletion prevention**: The backend prevents an admin from deleting their own account.
- **Rate limiting**: Applied globally via `express-rate-limit`.
- **Security headers**: Helmet is enabled on the backend.
- **Body size limits**: 10 MB max request body to mitigate abuse.
- **No password storage**: Passwords are managed entirely by Firebase Auth.
