# Production-Readiness Implementation Plan

## Information Gathered
- Frontend (`internarea`) builds successfully (37 pages).
- Backend (`backend`) has robust error handling, CORS, rate limiting, mongoose hardening, Firebase Admin init, Resend email, subscription/payment routes.
- **Critical issues:**
  1. Duplicate/conflicting Firebase configs: `@/firebase/firebase.js` (hardcoded, used by `_app`, `axiosClient`, `Navbar`, `storage`) vs `@/lib/firebase.ts` (env-based, returns auth=undefined when missing; used by login/signup/verify-email/OTP).
  2. i18n `runtime.tsx` (active provider) does NOT import `de` dictionary.
  3. Translation dictionaries `de/es/fr/pt/zh` only have `navbar`, `footer`, `pages.*` — missing ~14 top-level sections.
  4. Dead/duplicate i18n files: `t.ts`, `LanguageContext.tsx`, `i18n/index.ts`, `tWithFallback.ts`, `Trans.tsx`, `localeManager.ts`.
  5. `.env.example` frontend has duplicate `NEXT_PUBLIC_FIREBASE_PROJECT_ID`; backend missing Firebase Admin vars.

## Plan (file-level)
1. `src/lib/firebase.ts` — single source of truth, env vars with hardcoded fallback, export auth/storage/googleProvider.
2. Point all imports to `@/lib/firebase`; remove `src/firebase/*` duplicates.
3. `src/i18n/runtime.tsx` — add `de` dictionary import.
4. Complete translation keys for `de/es/fr/pt/zh`.
5. Remove dead i18n files (verify no imports).
6. Fix `.env.example` files.
7. Rebuild + lint.

## Dependent Files to Edit
- `src/lib/firebase.ts`
- `src/lib/axiosClient.ts`
- `src/pages/_app.tsx`
- `src/Components/Navbar.tsx`
- `src/firebase/storage.js` (removed)
- `src/firebase/uploadMedia.js` (removed)
- `src/i18n/runtime.tsx`
- `src/i18n/dictionaries/{de,es,fr,pt,zh}.ts`
- `.env.example` files

## Follow-up Steps
- Rebuild frontend (`next build`)
- Run lint
- Create TODO.md tracking
