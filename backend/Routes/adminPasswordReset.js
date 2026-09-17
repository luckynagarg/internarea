/**
 * Admin Password Reset Routes
 *
 * Provides OTP-based password reset for admin accounts.
 * Reuses existing email infrastructure (emailService, emailTemplates).
 * Stores credentials in MongoDB AdminConfig collection.
 *
 * Flow:
 *   1. Request OTP → sends OTP to ADMIN_EMAIL via existing email service
 *   2. Verify OTP   → validates the OTP
 *   3. Reset Password → stores new password hash in DB
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const asyncHandler = require('../middleware/asyncHandler');
const { badRequest, forbidden, internalServerError } = require('../utils/httpErrors');
const { sendEmail } = require('../services/emailService');
const { buildOtpEmailHtml, buildOtpPlainText } = require('../services/emailTemplates');
const AdminConfig = require('../Model/AdminConfig');

// ---------------------------------------------------------------------------
// OTP Configuration
// ---------------------------------------------------------------------------
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_OTP_ATTEMPTS = 5;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'luckynagar1505@gmail.com';
const ADMIN_NAME = process.env.ADMIN_NAME || 'InternArea Admin';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateOtp() {
  const num = crypto.randomInt(0, 1000000);
  return String(num).padStart(6, '0');
}

async function hashOtp(otp) {
  const secret = process.env.OTP_HMAC_SECRET;
  if (!secret) throw internalServerError('OTP_HMAC_SECRET is not set.');
  return crypto.createHmac('sha256', secret).update(String(otp)).digest('hex');
}

function timingSafeEqual(a, b) {
  const aBuf = Buffer.from(String(a), 'hex');
  const bBuf = Buffer.from(String(b), 'hex');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Get or create the singleton AdminConfig document.
 */
async function getAdminConfig() {
  let config = await AdminConfig.findById('admin_config');
  if (!config) {
    config = await AdminConfig.create({ _id: 'admin_config' });
  }
  return config;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * POST /api/admin/reset-password/send-otp
 *
 * Sends a password reset OTP to the configured ADMIN_EMAIL.
 * Uses the existing email templates and email service.
 */
router.post(
  '/send-otp',
  asyncHandler(async (req, res) => {
    const config = await getAdminConfig();
    const now = new Date();

    // Enforce resend cooldown
    if (config.lastOtpSentAt) {
      const delta = now.getTime() - config.lastOtpSentAt.getTime();
      if (delta < OTP_RESEND_COOLDOWN_MS) {
        throw forbidden('Please wait before requesting another OTP.');
      }
    }

    // Invalidate previous OTP
    if (!config.otpConsumed) {
      config.otpConsumed = true;
    }

    // Generate and hash OTP
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    config.otpHash = otpHash;
    config.otpExpiresAt = otpExpiresAt;
    config.otpAttempts = 0;
    config.maxOtpAttempts = MAX_OTP_ATTEMPTS;
    config.otpConsumed = false;
    config.lastOtpSentAt = now;
    await config.save();

    // Never log the OTP value
    console.log('[adminPasswordReset] OTP generated for admin email:', ADMIN_EMAIL);

    // Send email using existing email service and templates
    const html = buildOtpEmailHtml({
      toName: ADMIN_NAME,
      otp,
      purpose: 'passwordReset',
      expiryMinutes: 5,
    });
    const text = buildOtpPlainText({
      toName: ADMIN_NAME,
      otp,
      purpose: 'passwordReset',
      expiryMinutes: 5,
    });

    await sendEmail({
      toEmail: ADMIN_EMAIL,
      toName: ADMIN_NAME,
      subject: 'InternArea - Admin Password Reset OTP',
      html,
      text,
    });

    console.log('[adminPasswordReset] OTP email sent to admin');

    // Generic response to prevent email enumeration
    return res.status(200).json({
      success: true,
      message: 'If an admin account exists, an OTP has been sent to the registered email.',
    });
  })
);

/**
 * POST /api/admin/reset-password/verify-otp
 *
 * Verifies the OTP sent to the admin email.
 */
router.post(
  '/verify-otp',
  asyncHandler(async (req, res) => {
    const { otp } = req.body || {};
    if (!otp) throw badRequest('OTP is required.');

    const config = await getAdminConfig();

    if (!config.otpHash) throw badRequest('No OTP has been requested.');
    if (config.otpConsumed) throw badRequest('OTP has already been used.');
    if (!config.otpExpiresAt || config.otpExpiresAt.getTime() < Date.now()) {
      throw badRequest('OTP has expired. Please request a new one.');
    }
    if (config.otpAttempts >= config.maxOtpAttempts) {
      throw forbidden('Too many incorrect attempts. Please request a new OTP.');
    }

    const isCorrect = timingSafeEqual(await hashOtp(otp), config.otpHash);
    config.otpAttempts += 1;
    await config.save();

    if (!isCorrect) {
      throw badRequest('Invalid OTP.');
    }

    // Mark OTP as consumed (single-use)
    config.otpConsumed = true;
    await config.save();

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
    });
  })
);

/**
 * POST /api/admin/reset-password/update
 *
 * Updates the admin password after OTP verification.
 */
router.post(
  '/update',
  asyncHandler(async (req, res) => {
    const { newPassword } = req.body || {};

    if (!newPassword || typeof newPassword !== 'string') {
      throw badRequest('New password is required.');
    }
    if (newPassword.length < 6) {
      throw badRequest('Password must be at least 6 characters long.');
    }

    const config = await getAdminConfig();

    // Verify OTP was consumed (proves OTP verification happened)
    if (!config.otpConsumed) {
      throw forbidden('OTP verification is required before updating the password.');
    }

    // Hash the new password with bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 12);

    config.passwordHash = passwordHash;
    // Reset OTP fields for security
    config.otpHash = null;
    config.otpExpiresAt = null;
    config.otpAttempts = 0;
    config.lastOtpSentAt = null;
    await config.save();

    console.log('[adminPasswordReset] Admin password updated successfully');

    return res.status(200).json({
      success: true,
      message: 'Admin password updated successfully.',
    });
  })
);

module.exports = router;

