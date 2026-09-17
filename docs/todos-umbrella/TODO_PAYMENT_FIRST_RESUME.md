# Payment-First Resume Creation Flow — TODO

## Goal
Restructure Resume Creation so Razorpay payment happens BEFORE the resume information form.

## Backend
- [ ] Add `POST /api/resume/payment/create-order` (auth, Razorpay order, PaymentTransaction, returns orderId/amount/currency/keyId)
- [ ] Add `POST /api/resume/payment/verify` (signature verification, mark txn verified, create paid resume entitlement, idempotent)
- [ ] Add `GET /api/resume/create-access` (checks auth + paid entitlement)
- [ ] Add `PATCH /api/resume/:id/resume-data` (save form data into paid entitlement)
- [ ] Add `POST /api/resume/:id/generate` (generate PDF + mark generated)

## Frontend
- [ ] Restructure `/resume/create` to: auth check → create-access → payment → form → generate
- [ ] Handle cancel/failure (stay on payment screen, no form)
- [ ] Handle refresh/duplicate payment (reuse entitlement)

## Verification
- [ ] Auth + payment flow works end-to-end
- [ ] Direct `/resume/create` without payment -> redirect to payment
- [ ] Build passes
