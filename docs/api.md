# API

Base URL: configured via `NEXT_PUBLIC_API_BASE_URL` (frontend) or `PORT` (backend). In local development the backend runs at `http://localhost:5000`.

All endpoints return JSON. Successful responses use the format:

```json
{ "success": true, "data": { ... } }
```

Authentication is required on protected endpoints. Include a Firebase ID token (or admin session token) as:

```
Authorization: Bearer <token>
```

---

## Frontend API Routes

The Next.js frontend also exposes a few internal API routes:

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health check |

---

## Backend API Endpoints

### Public Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/` | No | Returns "backend running" |
| GET | `/api/health` | No | Health check: `{ ok: true, routes: [...] }` |
| GET | `/api/job` | No | List active jobs (paginated) |
| GET | `/api/job/:id` | No | Get a single job by ID |
| GET | `/api/internship` | No | List active internships (paginated) |
| GET | `/api/internship/:id` | No | Get a single internship by ID |
| GET | `/api/public/posts` | No | Public feed of posts (paginated, cursor-based) |
| GET | `/api/public/posts/:postId/comments` | No | List comments on a post |
| GET | `/api/public/posts/:postId/stats` | No (optional token) | Post likes/comments count |
| GET | `/api/public/friends/count` | Token required | Get friend count for posting limits |
| GET | `/api/search` | No | Search internships, jobs, companies |
| GET | `/api/companies` | No | Companies list (derived from jobs/internships) |
| POST | `/api/contact` | No | Contact form submission |

### Authentication Endpoints (Firebase)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Create user with email/password |
| POST | `/api/auth/login` | No | Sign in with email/password |
| POST | `/api/auth/google` | No | Google sign-in |
| POST | `/api/auth/forgot-password` | No | Send password reset email |
| POST | `/api/auth/reset-password` | No | Reset password with OTP |

### Login Security (Chrome OTP / Mobile Restriction)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/login/start` | Token required | Initiate login; enforces mobile time-window and Chrome OTP policy |
| POST | `/api/login/verify-otp` | Token required | Verify the email OTP for Chrome logins |
| POST | `/api/login/resend-otp` | Token required | Resend the login OTP email |
| GET | `/api/login/history` | Token required | Paginated login history for the authenticated user |

### Admin Endpoints

All admin endpoints require either an admin session token (from `POST /api/admin/adminlogin`) or a Firebase ID token with the admin custom claim.

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/admin/adminlogin` | No | Authenticate with admin credentials; returns session token |
| GET | `/api/admin/users` | Admin | List Firebase users enriched with UserProfile data |
| DELETE | `/api/admin/users/:userId` | Admin | Delete a user and all their data |
| GET | `/api/admin/dashboard/stats` | Admin | Real dashboard statistics (counts, conversion rate, trends) |
| GET | `/api/admin/settings` | Admin | Get platform settings |
| PUT | `/api/admin/settings` | Admin | Update platform settings (whitelisted fields) |
| GET | `/api/admin/internships` | Admin | List all internships (admin, no `isActive` filter) |
| POST | `/api/admin/internships` | Admin | Create an internship |
| PATCH | `/api/admin/internships/:id` | Admin | Update an internship |
| DELETE | `/api/admin/internships/:id` | Admin | Delete an internship |
| GET | `/api/admin/jobs` | Admin | List all jobs (admin, no `isActive` filter) |
| POST | `/api/admin/jobs` | Admin | Create a job |
| PATCH | `/api/admin/jobs/:id` | Admin | Update a job |
| DELETE | `/api/admin/jobs/:id` | Admin | Delete a job |
| GET | `/api/admin/applications` | Admin | List all applications (searchable, filterable, paginated) |
| GET | `/api/admin/applications/:id` | Admin | Get a single application |
| PATCH | `/api/admin/applications/:id/status` | Admin | Update an application status (`pending`/`accepted`/`rejected`) |
| GET | `/api/admin/login-history` | Admin | Admin login history (exportable) |
| POST | `/api/admin/reset-password` | Admin | OTP-based admin password reset |

### Application Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/application/` | Token required | Create an application (enforces monthly quota) |
| GET | `/api/application/` | Token required | List the caller's own applications |
| GET | `/api/application/:id` | Token required | Get an application (owner only) |
| PUT | `/api/application/:id` | Token required | Update application status (owner only) |

### Subscription & Payment Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/subscription` | Token required | Get current subscription + quota |
| POST | `/api/subscription/order` | Token required | Create a Razorpay order for payment |
| POST | `/api/subscription/verify` | Token required | Verify Razorpay payment signature |
| GET | `/api/subscription/history` | Token required | List subscription payment history |
| POST | `/api/subscriptions/webhook` | No (raw body) | Razorpay webhook handler |

### Resume Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/resume/create` | Token required | Create a resume (with OTP verification flow) |
| GET | `/api/resume/my-resumes` | Token required | List the caller's resumes |
| GET | `/api/resume/:id` | Token required | Get a single resume |
| DELETE | `/api/resume/:id` | Token required | Delete a resume |

### Profile Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/profile/bootstrap` | Token required | Create a UserProfile for a new Firebase user |
| GET | `/api/profile/me` | Token required | Get the caller's profile |
| PUT | `/api/profile/me` | Token required | Update profile (nickname, skills, etc.) |

### Friends Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/friends/request` | Token required | Send a friend request |
| GET | `/api/friends/list` | Token required | List friends |
| GET | `/api/friends/requests` | Token required | List pending friend requests |
| PUT | `/api/friends/accept/:id` | Token required | Accept a friend request |
| PUT | `/api/friends/reject/:id` | Token required | Reject a friend request |
| DELETE | `/api/friends/remove/:id` | Token required | Remove a friend |

### Friends (Development Only)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/debug/friends/seed` | Dev only | Create accepted friendships for testing |

### Messaging Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/messages/conversations` | Token required | List conversations |
| GET | `/api/messages/conversation/:id` | Token required | Get messages in a conversation |
| POST | `/api/messages/conversation` | Token required | Create or get a conversation |
| POST | `/api/messages` | Token required | Send a message |

### Public Space (Posts, Comments, Likes)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/public/posts` | Token required | Create a post (friend-count-based limits enforced) |
| DELETE | `/api/public/posts/:postId` | Token required | Delete own post |
| POST | `/api/public/posts/:postId/comments` | Token required | Add a comment |
| DELETE | `/api/public/posts/:postId/comments/:commentId` | Token required | Delete own comment |
| POST | `/api/public/posts/:postId/like` | Token required | Toggle like |

### Email OTP Auth

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/email-otp-auth/start` | No | Start email OTP authentication flow |
| POST | `/api/email-otp-auth/verify` | No | Verify email OTP |
| POST | `/api/email-otp-auth/resend` | No | Resend email OTP |

### Password Recovery

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/password-recovery/request` | No | Request a password reset OTP |
| POST | `/api/password-recovery/verify` | No | Verify the reset OTP |

### Language OTP

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/language/french-otp/start` | Token required | Start French language OTP verification |
| POST | `/api/language/french-otp/verify` | Token required | Verify French OTP |
| GET | `/api/language/french-otp/status` | Token required | Check if French is verified |

### Email Verification

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/email-verification/send` | Token required | Send email verification link |

---

## Response Conventions

### Standard Success Response

```json
{
  "success": true,
  "data": { ... },
  "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

### Standard Error Response

```json
{
  "success": false,
  "message": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (admin access required / quota exceeded) |
| 404 | Resource not found |
| 429 | Too many requests (rate limited) |
| 500 | Internal server error |
| 503 | Service unavailable (e.g. Firebase Admin not configured) |
