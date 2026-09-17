# Internarea Production-Readiness Fixes — Implementation TODO

## Scope
Non-destructive fixes to make the existing Internarea app fully functional, navigable, and build-ready.

## Steps
- [x] 1. Fix broken `/detailinternship` link typo → `/detailiternship` in `search/index.tsx`
- [x] 2. Replace hardcoded legacy backend URLs (`internshala-clone-y2p2.onrender.com`) with env-based API + auth headers in:
  - `applications/index.tsx`
  - `detailapplication/[id]/index.tsx`
  - `postInternship/index.tsx`
  - `postJob/index.tsx`
- [x] 3. Fix backend response-shape mismatches (backend returns `{ success, data }`) in `applications` and `detailapplication`
- [x] 4. Remove `href="#"` dead "Visit company website" links in `detailiternship/[id]` and `detailjob/[id]`
- [x] 5. Populate Footer with real page links + wire social icons to real destinations
- [x] 6. Load real application stats on Profile page (replace hardcoded "0")
- [x] 7a. Retire mock-data fallbacks in dashboard — switched dashboard to real backend API (public posts, jobs, internships, friend requests, notifications, friends)
- [x] 7b. Home page (`index.tsx`) — switched to env-based axiosClient and unwrapped `{ success, data }` response shape
- [x] 7c. Navbar — added responsive mobile hamburger menu (was missing on mobile)
- [x] 8. Verify build: `npx tsc --noEmit`, `next build`, backend `node --check`
- [ ] 9. Final audit report
