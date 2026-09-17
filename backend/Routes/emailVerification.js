/**
 * Email Verification Routes
 *
 * Uses Firebase Admin SDK to:
 * 1. Send email verification link to the user
 * 2. Check if the user's email is verified
 *
 * Google-authenticated users automatically have verified emails
 * and should bypass these checks.
 */

const express = require('express');
const router = express.Router();

const asyncHandler = require('../middleware/asyncHandler');
const { verifyFirebaseIdToken } = require('../middleware/authFirebase');
const { badRequest, forbidden } = require('../utils/httpErrors');
const { getAuthOrThrow } = require('../config/firebaseAdmin');

/**
 * POST /api/email-verification/send
 *
 * Sends a Firebase email verification link to the authenticated user.
 * Requires the user to be authenticated with an email/password account.
 * Google-authenticated users already have verified emails.
 */
router.post(
  '/send',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.uid;
    const userEmail = req.user.email;

    if (!userEmail) {
      throw badRequest('No email associated with this account.');
    }

    // Get the Firebase user record
    const userRecord = await getAuthOrThrow().getUser(userId);

    // Check if already verified
    if (userRecord.emailVerified) {
      return res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: 'Email is already verified.',
      });
    }

    // Generate email verification link
    const actionCodeSettings = {
      url: process.env.FRONTEND_URL || 'http://localhost:3000',
      handleCodeInApp: true,
    };

    const verificationLink = await getAuthOrThrow()
      .generateEmailVerificationLink(userEmail, actionCodeSettings);

    // Send verification email using existing email infrastructure
    const { sendEmail } = require('../services/emailService');
    const { buildVerificationEmailHtml, buildVerificationPlainText } = require('../services/emailTemplates');

    await sendEmail({
      toEmail: userEmail,
      toName: userRecord.displayName || 'User',
      subject: 'InternArea - Verify your email address',
      html: buildVerificationEmailHtml({
        toName: userRecord.displayName || 'User',
        verificationLink,
      }),
      text: buildVerificationPlainText({
        toName: userRecord.displayName || 'User',
        verificationLink,
      }),
    });

    return res.status(200).json({
      success: true,
      alreadyVerified: false,
      message: 'Verification email sent. Please check your inbox.',
    });
  })
);

/**
 * POST /api/email-verification/check
 *
 * Checks whether the authenticated user's email is verified.
 * Returns the verification status.
 */
router.post(
  '/check',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.uid;

    const userRecord = await getAuthOrThrow().getUser(userId);

    return res.status(200).json({
      success: true,
      emailVerified: userRecord.emailVerified,
      email: userRecord.email,
      // Google users typically have emailVerified=true
      provider: (userRecord.providerData || []).map((p) => p.providerId),
    });
  })
);

/**
 * POST /api/email-verification/status
 *
 * Convenience endpoint to check if email verification is needed.
 * Google-authenticated users can skip verification.
 */
router.post(
  '/status',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.uid;

    const userRecord = await getAuthOrThrow().getUser(userId);
    const providerIds = (userRecord.providerData || []).map((p) => p.providerId);
    const isGoogleUser = providerIds.includes('google.com');
    const emailVerified = userRecord.emailVerified || isGoogleUser;

    return res.status(200).json({
      success: true,
      emailVerified,
      isGoogleUser,
      requiresVerification: !emailVerified && !isGoogleUser,
      email: userRecord.email,
    });
  })
);

module.exports = router;

