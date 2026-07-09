Auth refactor notes:

- Central Firebase client must come from: src/lib/firebase.ts
- Phone OTP must come from: src/auth/PhoneOtpLogin.tsx
- Login UI must come only from: src/pages/login/index.tsx

This file is informational and should be removed after cleanup if you want zero extra files.

