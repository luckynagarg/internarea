/**
 * Contact/Query Routes
 *
 * Allows users to submit queries that get emailed to the admin (luckynagar1505@gmail.com)
 * and also sends a confirmation email back to the user.
 *
 * Security: No auth required for contact form. Rate limited globally.
 * No business logic changed. No API contracts broken.
 */

const express = require('express');
const router = express.Router();

const asyncHandler = require('../middleware/asyncHandler');
const { badRequest } = require('../utils/httpErrors');

const {
  buildQueryConfirmationHtml,
  buildAdminQueryNotificationHtml,
  sendTemplatedEmail,
} = require('../services/emailTemplates');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'luckynagar1505@gmail.com';
const ADMIN_NAME = process.env.ADMIN_NAME || 'InternArea Admin';

/**
 * POST /api/contact/submit
 *
 * Receives a user query and:
 * 1. Sends confirmation email to the user
 * 2. Sends notification email to admin (luckynagar1505@gmail.com)
 *
 * Body: { name, email, subject, message }
 */
router.post(
  '/submit',
  asyncHandler(async (req, res) => {
    const { name, email, subject, message } = req.body || {};

    // Validate required fields
    if (!email) throw badRequest('Email is required.');
    if (!message) throw badRequest('Message is required.');
    if (!subject) throw badRequest('Subject is required.');

    const userName = String(name || '').trim() || 'User';
    const userEmail = String(email).trim().toLowerCase();
    const querySubject = String(subject).trim();
    const queryMessage = String(message).trim();

    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      throw badRequest('Invalid email format.');
    }

    // Generate a simple ticket ID
    const ticketId = `QRY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Send confirmation to the user (best-effort, don't block response)
    const sendUserConfirmation = sendTemplatedEmail({
      toEmail: userEmail,
      toName: userName,
      subject: `[InternArea] We received your query - ${ticketId}`,
      html: buildQueryConfirmationHtml({
        userName,
        querySubject,
        queryMessage,
        ticketId,
      }),
    }).catch((err) => {
      console.error('[contact] Failed to send user confirmation email:', err.message);
    });

    // Send notification to admin (best-effort)
    const sendAdminNotification = sendTemplatedEmail({
      toEmail: ADMIN_EMAIL,
      toName: ADMIN_NAME,
      subject: `[InternArea Support] New Query from ${userName} - ${querySubject}`,
      html: buildAdminQueryNotificationHtml({
        userName,
        userEmail,
        querySubject,
        queryMessage,
        ticketId,
      }),
    }).catch((err) => {
      console.error('[contact] Failed to send admin notification email:', err.message);
    });

    // Wait for both emails to attempt sending
    await Promise.allSettled([sendUserConfirmation, sendAdminNotification]);

    return res.status(200).json({
      success: true,
      message: 'Your query has been submitted successfully. We will get back to you shortly.',
      data: {
        ticketId,
      },
    });
  })
);

module.exports = router;
