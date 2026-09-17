/**
 * Forgot Password routes (Task 2 spec).
 *
 * Replaces the previous OTP-based flow with a directly-issued temporary
 * password flow:
 *   - Reset by registered email OR phone.
 *   - Only ONE reset request allowed per IST calendar day.
 *   - Generates a random password containing ONLY letters (uppercase/lowercase).
 *   - Sends the generated password to the user's registered email.
 *   - If another reset is requested the same day, returns:
 *       "You can use this option only once per day."
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const asyncHandler = require('../middleware/asyncHandler');
const { badRequest } = require('../utils/httpErrors');

const {
  resetPassword,
  normalizeIdentifier,
  isValidEmail,
} = require('../services/forgotPasswordService');

// Brute-force / abuse protection for the reset endpoint (in addition to the
// per-account once-per-day rule enforced inside the service).
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many password reset requests. Please try again later.',
  },
});

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  asyncHandler(async (req, res) => {
    const { identifier } = req.body || {};

    const raw = String(identifier || '').trim();
    if (!raw) {
      throw badRequest('identifier is required.');
    }

    // Determine method: email if it looks like an email, otherwise phone.
    const method = isValidEmail(raw) ? 'email' : 'phone';
    const normalized = normalizeIdentifier(method, raw);
    if (!normalized) {
      throw badRequest('A valid email or phone number is required.');
    }

    const result = await resetPassword({ method, identifier: raw });

    // The daily restriction is a rate-limit condition -> 429.
    const statusCode = result.statusCode || 200;

    return res.status(statusCode).json({
      success: result.success,
      ...(result.code ? { code: result.code } : {}),
      message: result.message,
    });
  })
);

module.exports = router;
