# Render environment variables (Firebase Admin)

## Required

- `FIREBASE_SERVICE_ACCOUNT`
  - Raw JSON string for the Firebase Admin service account.

OR

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
  - The private key may be provided with escaped newlines; the backend will restore them.

## Also required for protected endpoints

- MongoDB connection string — resolved by `db.js` from (highest priority first):
  `MONGODB_URI` → `MONGO_URL` → `MONGO_URI` → `DATABASE_URL`.
  At least one must be set; otherwise `db.js` logs
  "Mongo will be treated as unavailable" and protected routes that query the DB return 500.

- **Recommended: set `MONGODB_URI`** to your MongoDB Atlas URI:
  `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

- **Critical Render gotcha — `DATABASE_URL` can be auto-injected:**
  When a Render PostgreSQL database is linked to the service, Render automatically
  overrides `DATABASE_URL` with a `postgres://...` URI. If startup logs show
  "DATABASE_URL is not a valid MongoDB connection string", check the host printed by the
  new diagnostics (`[startup] Mongo host:`). If it is a Postgres host, a linked Render
  Postgres is overriding `DATABASE_URL`. Fix by either:
  1. Unlinking/removing the Render Postgres database, or
  2. Setting `MONGODB_URI` (which takes precedence over `DATABASE_URL`).

- **Value hygiene:** the URI must start with `mongodb://` or `mongodb+srv://`, must NOT be
  wrapped in quotes, and must NOT contain leading/trailing spaces. `db.js` now trims the
  value and strips a single pair of surrounding quotes automatically.

- The backend prints startup diagnostics (never secrets): whether dotenv loaded, whether a
  connection string exists, whether it starts with `mongodb://`/`mongodb+srv://`, and the
  database hostname (credentials stripped).

## Troubleshooting 500s on protected endpoints

`GET /api/notifications`, `GET /api/resume/my-resumes`, and `GET /api/login/history`
all pass through `verifyFirebaseIdToken`. If you see 500s there, check the Render
startup logs for:

- `[startup] Firebase Admin NOT initialized: <reason>` -> set the Firebase Admin env vars above.
- `[startup] MongoDB is NOT available...` -> set `DATABASE_URL`.

After the hardening fix, a misconfigured Firebase Admin returns **503**
("Authentication service is not configured") instead of a generic 500, making the
root cause unmistakable.

## How to obtain the Firebase Admin service account

1. Go to the Firebase Console > Project Settings > Service accounts.
2. Click "Generate new private key" to download a JSON file.
3. Copy the entire JSON contents into `FIREBASE_SERVICE_ACCOUNT` on Render.
   (If you prefer individual vars, use `project_id`, `client_email`, and `private_key`
   from that JSON as `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.)
4. Ensure the private key's newlines are escaped (Render/CI often store them as `\n`).
