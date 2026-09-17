# Setup

## Prerequisites

- **Node.js**: 18.x or newer (tested with Node 20+)
- **npm**: 9.x or newer
- **Git**: for cloning the repository

### External Services (required for full functionality)

- A **Firebase project** with Authentication enabled (email/password, Google, phone)
- A **MongoDB Atlas cluster** (or self-hosted MongoDB 5+)
- A **Resend** account (for email delivery)
- A **Razorpay** account (for subscription payments — optional for local dev)
- A **Vercel** account (for frontend deployment — optional for local dev)

## Repository Structure

```
internarea/
├── internarea/              # Next.js frontend (TypeScript, Pages Router)
│   ├── src/
│   │   ├── pages/           # All route pages (auth, dashboard, admin panel, etc.)
│   │   ├── Components/      # Shared React components (Navbar, Footer, AdminLayout, etc.)
│   │   ├── i18n/            # i18n runtime, language provider, dictionaries (en/es/hi/pt/zh/fr)
│   │   ├── lib/             # Firebase client, axios client, auth utilities
│   │   └── Feature/         # Redux toolkit slices
│   ├── public/              # Static assets, favicon
│   └── package.json
├── backend/                 # Express API (JavaScript)
│   ├── index.js             # Entry point
│   ├── Routes/              # Express route modules
│   ├── Middleware/          # Auth, admin, error, rate-limit middleware
│   ├── Model/               # Mongoose schemas
│   ├── Services/            # Business logic (email, payment, subscription, etc.)
│   ├── config/              # Firebase Admin initialization
│   ├── scripts/             # Admin scripts (seed, test-user creation, diagnostics)
│   └── package.json
├── docs/                    # Project documentation
└── .gitignore
```

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd internarea
```

### 2. Install frontend dependencies

```bash
cd internarea
npm install
```

### 3. Install backend dependencies

```bash
cd ../backend
npm install
```

## Environment Variables

Create environment files from the provided examples:

```bash
# Backend
cd backend
cp .env.example .env

# Frontend
cd ../internarea
cp .env.example .env.local
```

Do **not** commit `.env` or `.env.local` files — they are in `.gitignore`.

See [Environment](environment.md) for the full list of required variables and their purposes.

### Firebase Service Account (backend)

The backend needs a Firebase service account JSON to verify ID tokens and manage users. You can provide it via one of these environment variables:

```env
# Option 1: Full JSON string (preferred for production)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...",...}

# Option 2: Individual fields
FIRECODE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Download the service account JSON from the Firebase Console > Project Settings > Service Accounts > "Generate new private key".

For local development, you can also save the JSON file and reference it:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=./services/internarea-1c6cd-firebase-adminsdk-fbsvc-7f5f76322e.json
```

> **Security**: The `backend/.gitignore` excludes Firebase service account JSON files from version control. Never commit these files.

## Running Locally

### Start the backend

```bash
cd backend
npm run dev
# Backend listens on http://localhost:5000
```

The backend will:
- Connect to MongoDB (required for production; the app starts in degraded mode without it)
- Initialize Firebase Admin (required for protected routes like `/api/notifications`, `/api/resume/my-resumes`, `/api/login/history`)
- Start Socket.IO on the same port

### Start the frontend

In a separate terminal:

```bash
cd internarea
npm run dev
# Frontend listens on http://localhost:3000
```

### Verify the setup

- Visit `http://localhost:3000` — the homepage should load
- Visit `http://localhost:5000/api/health` — should return `{"ok": true, ...}`
- In development, visit `http://localhost:5000/api/routes` — shows mounted routes

## Development Commands

### Frontend

```bash
cd internarea
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Jest tests
```

### Backend

```bash
cd backend
npm run dev          # Start with nodemon (auto-restart on changes)
node index.js        # Start without nodemon
node --check index.js  # Syntax check without running
```

## Database Seeding (optional)

```bash
cd backend
npm run seed         # Generate demo data (demo users, jobs, internships, posts)
```

See [backend/seed/README.md](backend/seed/README.md) for seed configuration options.

## Test User (optional)

```bash
cd backend
node scripts/create-test-user.js
# Creates a test Firebase user (test@test.com) — requires TEST_PASSWORD env var
```

## Production Build

```bash
# Frontend
cd internarea
npm run build

# Backend
cd ../backend
npm start
```

## Troubleshooting

See [Troubleshooting](troubleshooting.md) for common setup issues.
