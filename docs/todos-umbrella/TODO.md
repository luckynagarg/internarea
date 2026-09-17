# InternArea System Audit & Implementation - TODO

## Task 1 — Friend Request System
- [x] Audit friend routes (friends.js) - found working backend
- [x] Add GET /api/friends/list route to backend
- [x] Wire friends page to real API (send/accept/reject/remove/list)
- [x] Add optimistic UI, loading states, toasts
- [x] Add real-time update after acceptance

## Task 2 & 3 — Notification System + User Details
- [x] Audit Notification model, routes, service
- [x] Add fromUser/link/action/entityType/entityId fields to Notification model
- [x] Add nickname/verified fields to UserProfile model
- [x] Update notifications route to populate actor (photo, name, username, headline, verified, profile link)
- [x] Fix NotificationDropdown to use actor data + mark-as-read API
- [x] Add unread badge, mark all read, delete notification, pagination

## Task 4 — Login History Network Error
- [x] Audit frontend/backend login history
- [x] Improve error handling for auth/network errors
- [x] Ensure device/browser/OS/IP/location/date/success fields

## Task 5 & 6 — Resume Module
- [x] Audit resume routes, models, pages
- [x] Build out resume dashboard (my resumes, create, preview, download, delete, duplicate, edit, share, visibility)
- [x] Add backend routes for resume CRUD (list, get, delete, duplicate, update, visibility)

## Task 7 & 8 — Razorpay + QR
- [x] Audit subscription page, payment service, QR service
- [x] Fixed hardcoded API_BASE -> API_URL in subscription page
- [ ] Verify invoice download route exists
- [ ] Wire QR success/failure callbacks + polling

## Task 9-15 — Subscription, API, DB, UI, Backend, Performance audits
- [ ] Audit subscription middleware/premium protection
- [ ] Audit all API routes for 404/500/401/403
- [ ] Audit MongoDB indexes
- [ ] Audit frontend UI/loading/toasts
- [ ] Audit backend security/logging/rate limiting
- [ ] Performance optimizations
- [ ] Final end-to-end verification
