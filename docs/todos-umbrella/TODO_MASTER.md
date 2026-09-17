# Internarea Internship Requirement Implementation — Master TODO

## Phase 1: Public Space
- [x] Fix `computeAllowedPerDay` (10+ friends → unlimited; currently >10)
- [x] Use IST for daily posting date (currently server-local)
- [x] Add delete-own-post route
- [x] Add delete-own-comment route
- [x] Add like/comment notifications
- [x] Add upload MIME/size validation (backend + frontend)
- [x] Frontend: delete buttons for own posts/comments

## Phase 2: Forgot Password
- [x] Fix `listUsers` bug → `getUserByEmail`/`getUserByPhoneNumber`

## Phase 3: Resume OTP-before-payment
- [x] Wire OTP verification step into `resume/create` before Razorpay
- [x] Add/verify backend OTP route + entitlement flow

## Phase 4: Multi-language (exactly 6)
- [x] Remove `de` from `runtime.tsx` supported languages
- [x] Ensure all 6 languages (en/es/hi/pt/zh/fr) cover all UI keys

## Phase 5: French OTP server-side persistence
- [x] Add backend mechanism to record + validate verified French preference
- [x] Wire `FrenchOtpModal`/`runtime.tsx` to validate against backend
  - [x] languageOtpService: persist `verifiedLanguages` on UserProfile
  - [x] languageOtp route: add GET /french-otp/status endpoint
  - [x] frenchOtp.ts: add getFrenchOtpStatus()
  - [x] Navbar: check backend status before allowing French switch

## Phase 6: Login security wiring (Chrome OTP + Mobile restriction)
- [x] `login/index.tsx`: call `/api/login/start` after sign-in
- [x] Show OTP UI when `otpRequired`
- [x] Verify OTP via `/api/login/verify-otp`
- [x] Show mobile-restriction error message
- [x] Create `loginSecurity.ts` feature helper

## Phase 7: Security / DB / error hardening
- [x] Application IDOR fix: `Routes/application.js` GET /, GET /:id, PUT /:id now require Firebase auth and scope to `req.user.uid` (imported `notFound`)
- [x] Frontend `userapplication/index.tsx`: switched to authenticated `axiosClient`, handles `{ success, data }` response shape, removed hardcoded production URL
- [ ] Indexes, consistent errors, upload validation (partial — see audit)

## Phase 8: Build + verify
- [x] Backend syntax check (`node --check` on all modified routes/services)
- [x] TypeScript check (`npx tsc --noEmit` — 0 errors)
- [x] `next build` (production build runs; `.next/build` populating)
- [x] Application IDOR fix + frontend auth client wiring verified
- [ ] `next lint`
- [x] Final report
