# Internarea Audit & Fix Tracker

## Findings Summary
- **Working**: Firebase auth, subscription quota enforcement, Razorpay signature verification, public-space posting limits, friend system, forgot-password, French OTP, login security (Chrome OTP + mobile time window), resume payment flow.
- **Broken Frontend**: application filtering, search link typo, "Sign up to apply" → `/`, companies mock API, dashboard mock/dead buttons, missing mobile nav, dead code (Footer.tsx, de.ts).

## Fix Plan (file-level)
- [ ] **F1** `userapplication/index.tsx` — fix application filter (userId vs nested user.name)
- [ ] **F2** `search/index.tsx` — fix internship link `/detailinternship/` → `/detailiternship/`
- [ ] **F3** `detailjob/[id]/index.tsx` — "Sign up to apply" → `/signup`
- [ ] **F4** `detailiternship/[id]/index.tsx` — "Sign up to apply" → `/signup`
- [ ] **F5** `backend/Routes/search.js` — add `/api/companies` endpoint
- [ ] **F6** `companies/index.tsx` — use real `/api/companies`
- [ ] **F7** `dashboard/index.tsx` — wire Connect to `/api/friends/request`; fix Saved Jobs link
- [ ] **F8** `Navbar.tsx` — add mobile hamburger menu
- [ ] **F9** Delete dead `Components/Footer.tsx`
- [ ] **F10** Delete dead `i18n/dictionaries/de.ts`
- [ ] **F11** Build + lint + tsc verification
