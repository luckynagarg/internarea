# TODO - Auth Refactor (Production-ready)

- [x] Step 1: Remove global `<OtpLogin/>` rendering from `internarea/src/pages/_app.tsx` (fix OTP appearing above Navbar).
- [x] Step 2: Add centralized Firebase module under `internarea/src/lib/firebase.ts` (single `initializeApp` + exports `auth`, `storage`, `googleProvider`).
- [x] Step 3: Add `.env.local` and `.env.example` with all Firebase credentials; remove hardcoded config from all Firebase files.
- [x] Step 4: Create `internarea/src/auth/PhoneOtpLogin.tsx` reusable component implementing single-instance `RecaptchaVerifier`, resend, 60s countdown, cleanup.
- [x] Step 5: Create dedicated login page `internarea/src/pages/login/index.tsx` that contains ONLY Google + Phone OTP options.
- [x] Step 6: Update Navbar: remove Google button; replace with single `Login` button; ensure redirect/loading/errors; keep avatar after login.
- [x] Step 7: Implement centralized Google login using same Firebase instance + handle loading/errors/redirect.
- [ ] Step 8: Add shared Auth listener/context (`internarea/src/auth/AuthProvider.tsx`) if needed; ensure single `onAuthStateChanged` registration.
- [ ] Step 9: Remove duplicate/unused Firebase modules and old OTP component logic; ensure no dead code/unused imports.
- [ ] Step 10: Run TypeScript checks / build and verify requirements (only one Firebase app/auth/storage, only one OTP component, no duplicate logic).


