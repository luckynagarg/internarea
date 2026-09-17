# Subscription & Payment Management System - TODO

- [ ] Install dependencies (razorpay, firebase-admin, pdfkit, resend, express-rate-limit, helmet, zod)
- [ ] Add Firebase Admin initialization
- [ ] Add Firebase ID token auth middleware
- [ ] Add subscription/payment/invoice Mongoose models with indexes
- [ ] Add IST helper (10:00-11:00 enforcement)
- [ ] Add subscription service (plan resolution, quota calc, monthly range calc)
- [ ] Add Razorpay service (create order, verify signature)
- [ ] Add PDF invoice generator service
- [ ] Add email service (HTML template)
- [ ] Add REST routes for:
  - [ ] create-order
  - [ ] verify-payment
  - [ ] current subscription + quota
  - [ ] payment history
  - [ ] invoices list + download
- [ ] Update application creation route to enforce monthly quota server-side
- [ ] Add subscription dashboard frontend page + Razorpay checkout flow
- [ ] Update apply modal/UX to show quota + upgrade CTA
- [ ] Manual end-to-end testing in Razorpay Test Mode

