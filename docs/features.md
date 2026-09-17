# Features

## User Features

### Authentication

- Email and password sign-up / sign-in
- Google sign-in via OAuth
- Phone OTP authentication
- Email verification (Firebase built-in verification link)
- Password recovery via OTP sent to email
- Login security: Chrome browser requires email OTP on login; mobile logins restricted to IST 10:00–13:00
- Login history tracking (browser, device, OS, IP, location, timestamp, status)

### Profile

- View and edit profile (name, headline, bio, location, skills, college, company)
- Profile photo, cover photo, and social links
- Verified badge for admin-verified accounts
- Username/nickname with uniqueness enforcement
- Privacy settings (public, friends-only, private)

### Internships

- Browse active internships with pagination and search
- View internship details (title, company, location, category, stipend, about, perks, who can apply)
- Post new internships (requires Firebase authentication)

### Jobs

- Browse active jobs with pagination and search
- View job details (title, company, experience, salary, about, perks)
- Post new jobs (requires Firebase authentication)

### Applications

- Apply to internships with a cover letter (enforces monthly quota based on subscription)
- View own applications (scoped to authenticated user only)
- Track application status (pending, accepted, rejected)
- IDOR-protected: users can only view their own applications

### Subscriptions & Payments

- View current subscription and monthly application quota
- Razorpay checkout for paid plans
- Payment history and invoice download (PDF)
- IST time window enforcement for paid activation (10:00–11:00 IST)

### Resume Builder

- Create and manage resumes
- Resume creation requires OTP verification before payment
- Preview and download resumes as PDF
- Duplicate, edit, and delete resumes
- Resume visibility settings

### Public Space (Social Feed)

- View public posts from the community (no auth required)
- Create posts (auth required; limited by friend count: 0 friends = 0 posts, 1 friend = 1/day, 2 friends = 2/day, 10+ friends = unlimited)
- Like and comment on posts (auth required)
- Delete own posts and comments
- IST-based daily posting limits (consistent regardless of server timezone)

### Friends System

- Send and receive friend requests
- Accept, reject, and remove friends
- Friend count affects posting limits
- Search and discover users by name, username, or UID

### Messaging

- Real-time 1-to-1 conversations via Socket.IO
- Send and receive messages in real time
- View conversation list
- Create new conversations

### Notifications

- Real-time notifications (via Socket.IO and database)
- Notification types: application, internship, announcement, social, profile, admin, resume, subscription, payment
- Mark as read, mark all as read, delete individual notifications
- Unread count badge
- Actor information populated (name, photo, nickname)
- Auto-expiry after 180 days (MongoDB TTL index)

### Search

- Global search across internships, jobs, and companies
- Real-time search suggestions while typing
- Filter results by category

### Companies

- Browse companies derived from internships and jobs
- View company-specific listings

### Internationalisation (i18n)

- 6 supported languages: English, Spanish, Hindi, Portuguese, Chinese, French
- Runtime i18n engine with English as fallback
- Language persisted in localStorage
- Interpolation and pluralization support

## Admin Features

### Admin Authentication

- Username/password login (credentials from env vars or DB-stored bcrypt hash)
- Server-signed HMAC session tokens (8-hour TTL)
- Firebase admin custom claims as alternative

### Admin Dashboard

- Real database-backed statistics (total users, applications, active jobs/internships, conversion rate)
- 30-day trend comparisons

### User Management

- List all Firebase Auth users with profile enrichment
- Search users by email, name, nickname, or UID
- Delete users (cascades to MongoDB data and Firebase Auth account)
- Self-deletion prevention

### Content Management

- Create, edit, archive, and delete jobs
- Create, edit, archive, and delete internships
- Search and paginate content

### Application Management

- List all applications with search, filter, and pagination
- View application details
- Update application status (pending, accepted, rejected)

### Analytics

- Platform metrics from live database queries
- Applications by status breakdown
- Jobs vs. internships comparison
- 30-day trend indicators

### Settings

- Platform configuration (site name, support email, free plan limits, Public Space toggle)
- Content moderation toggles
- Notification settings
- Field-whitelisted updates for security

### Login History (Admin)

- View login attempt records across all users
- Export login history

### Admin Password Reset

- OTP-based password reset flow for admin accounts

## Partially Implemented / Under Development

These features are present in the codebase but may not be fully tested or documented:

- Multi-language support currently includes 6 languages. German (`de`) was removed from the active runtime and only exists as a locale JSON file.
- Email OTP authentication (`/api/email-otp-auth/*`) is implemented as a separate module.
- French language OTP verification requires OTP before switching the UI to French.
- Payment time window enforcement (paid activation restricted to IST 10:00–11:00) — configurable via env vars.
