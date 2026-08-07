# Production Optimization TODO

## Phase 1: Upgrade Dependencies
- [ ] Upgrade Next.js from 15.2.1 to latest patched compatible version
- [ ] Update react/react-dom if required
- [ ] Update eslint-config-next to match

## Phase 2: Fix Build Error
- [ ] Fix apostrophe escaping in `verify-email/index.tsx` (react/no-unescaped-entities)

## Phase 3: Configure Image Optimization
- [ ] Add `images.remotePatterns` to `next.config.ts` for external hosts
  - via.placeholder.com
  - lh3.googleusercontent.com
  - firebasestorage.googleapis.com

## Phase 4: Replace `<img>` tags with `next/image`
- [ ] `Components/Navbar.tsx` (2 images)
- [ ] `pages/dashboard/index.tsx` (5 images) + fix hook deps
- [ ] `pages/chat/index.tsx` (1 image)
- [ ] `pages/companies/index.tsx` (1 image)
- [ ] `pages/detailapplication/[id]/index.tsx` (1 image)
- [ ] `pages/friends/components/FriendCard.tsx` (1 image)
- [ ] `pages/friends/index.tsx` (2 images)
- [ ] `pages/profile/index.tsx` (1 image)
- [ ] `pages/public/index.tsx` (2 images)

## Phase 5: Fix Hook Warnings
- [ ] Fix `react-hooks/exhaustive-deps` in `dashboard/index.tsx`

## Phase 6: Code Quality
- [ ] Remove duplicate `getAuthHeaders` import in `friends/index.tsx`
- [ ] Remove dead code / unused imports in `pages/index.tsx`
- [ ] Replace hardcoded API URLs with env-based config

## Phase 7: Verification
- [ ] Run `next lint` — zero errors/warnings
- [ ] Run `next build` — zero errors/warnings
- [ ] Capture before/after bundle size comparison
- [ ] Confirm Vercel-ready deployment
