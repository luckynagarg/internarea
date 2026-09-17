# Deploy Fix TODO

## Goal
Fix the two deploy-blocking issues observed in Render logs:
1. MongoDB connection failure (`Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"`)
2. Duplicate Mongoose schema index warnings

## Steps

- [x] Analyze deployment logs and identify root causes
- [x] Read all backend models to locate duplicate index definitions
- [x] Get user approval on the plan

### Code fixes (duplicate indexes)
- [x] Fix `Model/UserProfile.js` — remove redundant `index: true` on `firebaseUid` and `username` (keep `schema.index()`)
- [x] Fix `Model/LoginHistory.js` — remove redundant `index: true` on `user` and `email` (keep `schema.index()`)
- [x] Fix `Model/LanguageOtpChallenge.js` — remove redundant `index: true` on `userId` (keep `schema.index({ userId: 1 }, { unique: true })`)

### Startup diagnostics
- [x] Update `db.js` to validate DATABASE_URL scheme and print an actionable error message

### Documentation
- [x] Confirm `.env.example` already documents `DATABASE_URL` (it does; ENV_AUDIT.md was stale)
- [x] Update `RENDER_ENV_VARS.md` with clear DATABASE_URL troubleshooting

### Verification
- [x] Loaded all 23 models — confirmed no duplicate index warnings
- [x] Tested db.js URI validation with an invalid URI — prints actionable error message
- [ ] Confirm MongoDB connection succeeds with valid DATABASE_URL (requires real credentials on Render)
