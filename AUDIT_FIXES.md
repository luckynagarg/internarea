# Frontend Production Audit — Verified Fixes

## Root Cause of the Vercel Build Failure — CONFIRMED

Running `npx next build` locally reproduced the Vercel failure. Three causes were confirmed:

1. **`json-loader` webpack rule failed at compile time**
   - `next.config.ts` pushed a `json-loader` rule for `/locales/` JSON files.
   - `json-loader` was **not** in `package.json`/`package-lock.json` and is deprecated/removed for webpack 5 (Next 15 uses webpack 5, which natively imports JSON).
   - Result: `Module not found: Can't resolve 'json-loader'` → abort during `Creating an optimized production build`.

2. **`react/no-unescaped-entities` lint error blocked the build**
   - `src/pages/verify-email/index.tsx:199` had a literal apostrophe in JSX text.
   - `next build` runs lint first; this **Error** (not warning) aborted the build before compilation.

3. **Stale/corrupted `.next` cache caused misleading secondary errors**
   - After the above failures left partial artifacts, subsequent builds showed:
     - `Cannot find module '...applications.js'` during prerender of `/applications`
     - `ENOENT rename '.next/export/adminlogin.html' -> '.next/server/pages/adminlogin.html'`
   - These are classic **stale `.next` cache** symptoms, not actual code errors. Cleaning `.next` and rebuilding resolved them.

## Files Modified (verified fixes)

### 1. `next.config.ts`
- Removed the `json-loader` webpack block.
- Added `poweredByHeader: false` (security hardening).

### 2. `src/pages/verify-email/index.tsx`
- Wrapped the apostrophe text in a JSX expression string to satisfy `react/no-unescaped-entities`:
  ```tsx
  {"Click the link in the email to verify your account. If you don't see it, check your spam folder."}
  ```

### 3. `package.json`
- Removed `bcrypt` from dependencies (verified unused in `src/`; native-module install risk).

## Verification Result
- `npx next build` (after `rm -rf .next`) → **SUCCESS** (`BUILD_COMPLETE_EXIT=0`)
- 37 pages prerendered, including `/applications` and `/adminlogin`.
- Only non-fatal warnings remain (all `no-img-element` `<img>` suggestions + one `react-hooks/exhaustive-deps`), which do not block the build.

## Deployment Notes
- **Vercel caches `.next`**: after deploying this fix, Vercel should run a clean build automatically. If the same file-not-found/rename errors appear, trigger **"Redeploy"** with **"Clear build cache"** from the Vercel dashboard.
- Remaining env config (not code): set `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_FIREBASE_*` on Vercel; unify the duplicate Firebase configs. These do **not** block the build but are required for production runtime behavior.
