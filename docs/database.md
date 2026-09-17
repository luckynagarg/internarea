# Database

InternArea uses **MongoDB** (via Mongoose ODM) as its primary data store. Firebase Authentication handles all credential management — the database stores application data only.

## Connection

The backend connects to MongoDB using `mongoose.connect()` in `backend/db.js`. The connection string is resolved with the following priority:

1. `MONGODB_URI`
2. `MONGO_URL`
3. `MONGO_URI`
4. `DATABASE_URL` (backward-compatible fallback)

In production, if MongoDB is unavailable, the backend exits with a non-zero code so the platform (e.g. Render) restarts it.

## Collection Names

Mongoose model names map to MongoDB collections (pluralized by default):

| Model | File | Collection |
|---|---|---|
| UserProfile | `Model/UserProfile.js` | `userprofiles` |
| Application | `Model/Application.js` | `applications` |
| Job | `Model/Job.js` | `jobs` |
| Internship | `Model/Internship.js` | `internships` |
| PublicPost | `Model/PublicPost.js` | `publicposts` |
| PostComment | `Model/PostComment.js` | `postcomments` |
| PostLike | `Model/PostLike.js` | `postlikes` |
| Friendship | `Model/Friendship.js` | `friendships` |
| FriendRequest | `Model/FriendRequest.js` | `friendrequests` |
| DailyPostLimit | `Model/DailyPostLimit.js` | `dailypostlimits` |
| Notification | `Model/Notification.js` | `notifications` |
| Conversation | `Model/Conversation.js` | `conversations` |
| Message | `Model/Message.js` | `messages` |
| Resume | `Model/Resume.js` | `resumes` |
| Subscription | `Model/Subscription.js` | `subscriptions` |
| PaymentTransaction | `Model/PaymentTransaction.js` | `paymenttransactions` |
| Invoice | `Model/Invoice.js` | `invoices` |
| Settings | `Model/Settings.js` | `appsettings` |
| AdminConfig | `Model/AdminConfig.js` | `adminconfigs` |
| LoginHistory | `Model/LoginHistory.js` | `loginhistories` |
| EmailOtpChallenge | `Model/EmailOtpChallenge.js` | `emailotpchallenges` |
| LanguageOtpChallenge | `Model/LanguageOtpChallenge.js` | `languageotpchallenges` |
| LoginOtpVerification | `Model/LoginOtpVerification.js` | `loginotpverifications` |
| ResumeOtpVerification | `Model/ResumeOtpVerification.js` | `resumeotpverifications` |
| PasswordRecovery | `Model/PasswordRecovery.js` | `passwordrecoveries` |
| PostReport | `Model/PostReport.js` | `postreports` |

## Schemas

### UserProfile

Linked to a Firebase Auth user via `firebaseUid` (unique, indexed). Stores extended profile data not held by Firebase Auth.

| Field | Type | Notes |
|---|---|---|
| `firebaseUid` | String | Required, unique, indexed. Links to Firebase Auth UID |
| `username` | String | Optional, partial unique index (case-insensitive search) |
| `nickname` | String | Optional, partial unique index |
| `lowercaseNickname` | String | Lowercased copy for case-insensitive lookup |
| `name` | String | Display name |
| `email` | String | Lowercased |
| `photo` / `profilePhoto` / `coverPhoto` | String | Image URLs |
| `headline` | String | Professional headline |
| `bio` | String | Short biography |
| `verified` | Boolean | Admin-verified badge |
| `location` | String | |
| `skills` | [String] | |
| `college` / `company` | String | |
| `socialLinks` | Object | Flexible structure |
| `privacy` | String | `public`, `friends`, `private` (indexed) |
| `friends` | [String] | Array of friend UIDs (indexed) |
| `friendCount` | Number | Denormalized count (indexed) |
| `verifiedLanguages` | [String] | Server-side record of OTP-verified language preferences |
| `isTestUser` | Boolean | QA/internal flag (indexed) |
| `createdAt` / `updatedAt` | Date | |

**Index notes**: `username`, `nickname`, and `lowercaseNickname` use partial unique indexes (`partialFilterExpression` with `$type: 'string'`) to avoid duplicate-key errors when the field is absent.

### Application

| Field | Type | Notes |
|---|---|---|
| `company` | String | |
| `category` | String | |
| `coverLetter` | String | |
| `user` | Object | Legacy user reference |
| `userId` | String | Auth-enforced user identity (indexed) |
| `status` | String | `pending`, `accepted`, `rejected` (default: `pending`) |
| `Application` | Object | Reference to the internship/job applied for |
| `createdAt` | Date | Indexed |

Compound index: `{ userId: 1, createdAt: 1 }`

### Job

| Field | Type | Notes |
|---|---|---|
| `title` / `company` / `location` | String | |
| `category` | String | |
| `aboutCompany` / `aboutJob` / `whoCanApply` | String | |
| `perks` | [String] | |
| `Experience` | String | |
| `AdditionalInfo` | String | |
| `CTC` / `StartDate` | String | |
| `isActive` | Boolean | Defaults to `true` (indexed) |

### Internship

| Field | Type | Notes |
|---|---|---|
| `title` / `company` / `location` | String | |
| `category` | String | |
| `aboutCompany` / `aboutInternship` / `whoCanApply` | String | |
| `perks` | [String] | |
| `numberOfOpening` / `stipend` / `startDate` / `additionalInfo` | String | |
| `isActive` | Boolean | Defaults to `true` (indexed) |
| `createdAt` | Date | |

### PublicPost

| Field | Type | Notes |
|---|---|---|
| `author` | Object | `{ userId, name, photo }` |
| `caption` | String | |
| `media` | Array | `[{ mediaType, url }]` |
| `createdAt` | Date | Indexed |

### Notification

| Field | Type | Notes |
|---|---|---|
| `userId` | String | Required, indexed |
| `title` / `message` | String | Required |
| `body` | String | Optional long-form body |
| `type` | String | Enum: `application`, `internship`, `announcement`, `profile`, `social`, `admin`, `resume`, `subscription`, `payment` |
| `read` | Boolean | Default `false` (indexed) |
| `fromUser` | String | Actor UID (indexed) |
| `link` | String | Client-side navigation target |
| `action` | String | Optional button label |
| `entityType` / `entityId` | String | Deep-link references |
| `createdAt` | Date | Indexed, TTL (180 days) |

Composite indexes: `{ userId: 1, read: 1, createdAt: -1 }` and `{ userId: 1, createdAt: -1 }`

### Settings (Singleton)

A single document (`_id: "app_settings"`) storing non-secret platform configuration:

- `platform`: siteName, supportEmail, maxApplicationsPerFree, enablePublicSpace
- `content`: requireApprovalForJobs, requireApprovalForInternships, maxCaptionLength
- `notifications`: enableEmailNotifications, enableSocialNotifications

Admin API updates use a field whitelist — arbitrary keys cannot be injected.

### Other Models

- **Friendship**: `{ userId, friendId, status }` — status is `pending` or `accepted`. Unique compound index on `{ userId, friendId }`.
- **DailyPostLimit**: `{ userId, date, count }` — enforces per-day posting limits in Public Space.
- **Conversation** / **Message**: Real-time 1-to-1 messaging. Messages reference the conversation and sender.
- **Resume**: Resume content stored as structured data, linked to `firebaseUid`.
- **Subscription**: Tracks user subscription state, plan, quota.
- **PaymentTransaction**: Razorpay payment records.
- **Invoice**: PDF invoice metadata.
- **LoginHistory**: Records of user login events (device, browser, IP, location, timestamp).
- **OTP models**: `EmailOtpChallenge`, `LanguageOtpChallenge`, `LoginOtpVerification`, `ResumeOtpVerification` — each with a TTL index for auto-expiry.

## Data Ownership / Security

- **User identity** is derived from verified Firebase tokens, never from request bodies.
- **Application data** is scoped to the authenticated user: `GET /api/application/` returns only the caller's applications.
- **Admin operations** re-verify admin claims server-side on every request.
- **Secret storage**: No passwords, API keys, or tokens are stored in MongoDB. All secrets live in environment variables.
