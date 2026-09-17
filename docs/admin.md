# Admin Panel

InternArea includes a protected admin panel for managing the platform. Admin authentication is separate from regular user authentication.

## Admin Authentication

### Login Flow

1. Navigate to `https://<frontend>/adminlogin`
2. Enter admin credentials (username/password)
3. The backend (`POST /api/admin/adminlogin`) validates credentials and issues a server-signed session token
4. The token is stored in `localStorage` under key `internarea_admin_session_token`
5. All subsequent admin API calls include the token as `Authorization: Bearer <token>`

### Credentials

Admin credentials are configured via environment variables:

| Variable | Description |
|---|---|
| `ADMIN_USER` | Admin username (default: `admin`) |
| `ADMIN_PASS` | Admin password (min 8 characters) |
| `ADMIN_EMAIL` | Admin contact email |
| `ADMIN_NAME` | Admin display name |

Alternatively, an `AdminConfig` document in MongoDB can store a bcrypt password hash (set via the password reset flow).

### Session Token

| Property | Details |
|---|---|
| Format | `base64url(payload).base64url(hmac)` (2 segments) |
| Algorithm | HMAC-SHA256 |
| Secret | `ADMIN_SESSION_SECRET` (min 32 characters) |
| TTL | 8 hours |
| Storage | `localStorage` |

### Logout

Admin logout calls `clearAuthStorage()` which removes all `internarea_*` keys from `localStorage` and `sessionStorage` (except the language preference).

## Admin Panel Pages

All pages are under `/adminpanel/*` and use the shared `AdminLayout` component.

### Dashboard (`/adminpanel`)

- Loads real DB-backed statistics from `GET /api/admin/dashboard/stats`
- Shows: total applications, active jobs, active internships, conversion rate, total users
- Displays 30-day trend deltas vs. previous period

### Applications (`/adminpanel/applications`)

- List all applications with search, filter, and pagination
- View individual application details
- Update application status (pending/accepted/rejected)

### Jobs (`/adminpanel/jobs`)

- List all jobs with search and pagination
- Create new jobs
- Edit existing jobs
- Archive/unpublish jobs

### Internships (`/adminpanel/internships`)

- List all internships with search and pagination
- Create new internships
- Edit existing internships
- Archive/unpublish internships

### Manage Users (`/adminpanel/users`)

- List Firebase Auth users enriched with UserProfile data
- Search by email, name, nickname, or UID
- Delete users (deletes all associated data including MongoDB records and Firebase Auth account)
- Prevents self-deletion

### Analytics (`/adminpanel/analytics`)

- Detailed platform metrics from live database queries
- Applications by status (pending/accepted/rejected)
- Jobs vs. internships comparison
- 30-day trend indicators with up/down/neutral icons

### Settings (`/adminpanel/settings`)

- Platform settings: site name, support email, max applications per free plan, Public Space toggle
- Content moderation: approval requirements for jobs/internships, max caption length
- Notifications: email and social notification toggles
- All changes are persisted to the `Settings` collection in MongoDB

### Login History (`/adminpanel/security/login-history`)

- View login attempts by all users
- Export login history data

## Admin API Endpoints

All admin endpoints are protected by the `requireAdminAccess` middleware.

| Method | Route | Description |
|---|---|---|
| POST | `/api/admin/adminlogin` | Authenticate and receive session token |
| GET | `/api/admin/users` | List all users |
| DELETE | `/api/admin/users/:userId` | Delete a user |
| GET | `/api/admin/dashboard/stats` | Dashboard statistics |
| GET | `/api/admin/settings` | Get settings |
| PUT | `/api/admin/settings` | Update settings |
| GET | `/api/admin/internships` | List all internships |
| POST | `/api/admin/internships` | Create internship |
| PATCH | `/api/admin/internships/:id` | Update internship |
| DELETE | `/api/admin/internships/:id` | Delete internship |
| GET | `/api/admin/jobs` | List all jobs |
| POST | `/api/admin/jobs` | Create job |
| PATCH | `/api/admin/jobs/:id` | Update job |
| DELETE | `/api/admin/jobs/:id` | Delete job |
| GET | `/api/admin/applications` | List all applications |
| GET | `/api/admin/applications/:id` | Get application |
| PATCH | `/api/admin/applications/:id/status` | Update status |
| GET | `/api/admin/login-history` | Login history |
| POST | `/api/admin/reset-password` | Admin password reset |

## Authorization Model

Admin access is verified in two layers:

1. **Frontend**: `AdminLayout` checks for the session token in `localStorage` and redirects to `/adminlogin` if absent
2. **Backend**: Every `/api/admin/*` request (except `/adminlogin`) goes through `requireAdminAccess` middleware, which accepts either:
   - A valid admin session token (HMAC-SHA256 verified)
   - A Firebase ID token with the `admin` custom claim

The frontend check is for UX only — actual authorization is enforced server-side on every request.

## Security Considerations

- Admin credentials should use strong, unique passwords
- `ADMIN_SESSION_SECRET` must be at least 32 characters
- Admin session tokens expire after 8 hours
- All admin operations are logged (user deletion audit logs are written to stdout)
- Settings updates use a field whitelist — arbitrary fields cannot be injected
- The admin password reset flow uses OTP verification
