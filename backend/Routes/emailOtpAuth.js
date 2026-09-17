const express = require('express');
const router = express.Router();

const { start, verify, resend } = require('../controllers/emailOtpController');
const buildRateLimiter = require('../middleware/rateLimit');

// Extra stricter per-IP limiter for OTP endpoints.
// (Global limiter already exists in backend/index.js; this is additional.)
const otpRouteLimiter = buildRateLimiter();

router.post('/start', otpRouteLimiter, start);
router.post('/resend', otpRouteLimiter, resend);
router.post('/verify', otpRouteLimiter, verify);

module.exports = router;

