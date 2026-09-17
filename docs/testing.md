# Testing

## Test Strategy

InternArea does not currently have a formal automated test suite. There is a Jest configuration present (`jest.config.js` in the frontend) but no test files exist in the codebase.

## Available Scripts

### Frontend

```bash
cd internarea
npm test             # Jest (configured but no tests exist)
npm run build        # Production build (includes TypeScript type checking)
npm run lint         # ESLint
```

### Backend

```bash
cd backend
npm run dev          # nodemon (auto-restart on changes)
npm start            # node index.js (production)
node --check <file>  # Syntax check a single file
npm test             # Not configured (returns "Error: no test specified")
```

## Manual Testing

### Frontend

1. Start the dev server: `cd internarea && npm run dev`
2. Visit `http://localhost:3000`
3. Test authentication:
   - Sign up with email/password
   - Sign in with Google
   - Verify email verification flow
4. Test core features:
   - Browse internships and jobs
   - Apply to an internship (requires subscription quota)
   - Create a post in Public Space
   - Send/receive messages
   - View and manage notifications
5. Test admin panel:
   - Navigate to `/adminlogin`
   - Log in with admin credentials
   - Verify dashboard statistics
   - Manage users, jobs, internships, applications
   - Update settings

### Backend

1. Start the backend: `cd backend && npm run dev`
2. Verify health: `curl http://localhost:5000/api/health`
3. Verify routes (development only): `curl http://localhost:5000/api/routes`
4. Test endpoints with Postman/curl:
   - `GET /api/job` — list jobs (no auth required)
   - `GET /api/internship` — list internships (no auth required)
   - `POST /api/application/` — requires Firebase ID token
   - `GET /api/admin/dashboard/stats` — requires admin session token

### Build Verification

```bash
# Frontend production build (includes tsc type checking)
cd internarea && npm run build

# Backend syntax check on all modified files
cd backend
node --check index.js
node --check backend/Routes/admin.js
node --check backend/Routes/application.js
# ... check all modified files
```

## Verification Checklist

Before deployment, verify:

- [ ] `npm run build` completes without TypeScript errors
- [ ] All admin panel pages load (`/adminpanel`, `/adminpanel/analytics`, etc.)
- [ ] Backend starts without errors (`npm start` or `node index.js`)
- [ ] MongoDB connection succeeds (check for "Database is connected" in logs)
- [ ] Firebase Admin initializes (check for "Firebase Admin: initialized OK" in logs)
- [ ] `/api/health` returns `{"ok": true}`
- [ ] Admin login works (`POST /api/admin/adminlogin`)
- [ ] Protected routes return 401 without a token
- [ ] Admin routes return 401/403 for non-admin tokens
- [ ] CORS allows the frontend origin
- [ ] Socket.IO connects from the frontend

## Testing Recommendations

For future development, consider adding:

1. **Backend unit tests** with Jest for service-layer logic (e.g. `adminStatsService`, `subscriptionService`)
2. **Backend API tests** with `supertest` for route handlers
3. **Frontend component tests** with React Testing Library
4. **Integration tests** that verify the full auth flow (Firebase token → backend verification → database query)
