# Email OTP Auth (production) - required environment variables

This module is mounted at:
- `POST /api/email-otp-auth/start`
- `POST /api/email-otp-auth/verify`
- `POST /api/email-otp-auth/resend`

## OTP crypto
- `OTP_HMAC_SECRET` (required)
  - Secret used to HMAC-hash OTP values before storing them.

## Resend (Email Delivery)
These are used by the production `backend/services/emailService.js` Resend client.
- `RESEND_API_KEY` (required) your Resend API key from https://resend.com/api-keys
- `EMAIL_FROM` (required) the verified sender email address, e.g. `InternArea <no-reply@yourdomain.com>`
- `EMAIL_FROM_NAME` (optional) default `InternArea`

## DATABASE
- `DATABASE_URL` required for OTP persistence.

## Notes
- OTP values are never logged.
- OTP records are auto-expired via MongoDB TTL index on `otpExpiresAt`.

