/**
 * French language OTP routes.
 *
 * Security: only the authenticated Firebase user may request/verify an OTP.
 * The email used for delivery is taken from the verified token (req.user.email),
 * never from the request body.
 */
const express = require('express');
const router = express.Router();

const asyncHandler = require('../middleware/asyncHandler');
const { verifyFirebaseIdToken } = require('../middleware/authFirebase');
const { badRequest } = require('../utils/httpErrors');
const buildRateLimiter = require('../middleware/rateLimit');

const {
  issueLanguageOtp,
  verifyLanguageOtp,
  isLanguageVerified,
} = require('../services/languageOtpService');

// Stricter per-IP limiter for OTP endpoints (on top of the global limiter).
const otpRouteLimiter = buildRateLimiter();

// POST /api/language/french-otp/request
router.post(
  '/french-otp/request',
  verifyFirebaseIdToken,
  otpRouteLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.user.uid;
    const email = req.user.email;
    const name = req.user.name || '';

    await issueLanguageOtp({ userId, email, name });

    return res.status(200).json({
      success: true,
      otpRequired: true,
      message: 'OTP sent to your email.',
      expiresInSeconds: 5 * 60,
    });
  })
);

// POST /api/language/french-otp/verify
router.post(
  '/french-otp/verify',
  verifyFirebaseIdToken,
  otpRouteLimiter,
  asyncHandler(async (req, res) => {
    const { otp } = req.body || {};
    if (!otp) throw badRequest('otp is required.');

    const result = await verifyLanguageOtp({ userId: req.user.uid, otp });

    if (!result?.verified) throw badRequest('OTP verification failed.');

return res.status(200).json({
      success: true,
      verified: true,
      message: 'OTP verified. You can now switch to French.',
    });
  })
);

// GET /api/language/french-otp/status — check if French is already verified
router.get(
  '/french-otp/status',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.uid;
    const result = await isLanguageVerified(userId, 'fr');
    return res.status(200).json({
      success: true,
      verified: result.verified,
    });
  })
);

module.exports = router;
