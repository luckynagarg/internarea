/**
 * Email OTP delivery service.
 *
 * Sends professional OTP verification emails using the new email template system.
 * Uses the Resend-based email service (emailService.js).
 */

const { sendTemplatedEmail, buildOtpEmailHtml } = require('./emailTemplates');

async function sendEmailOtp({ toEmail, toName, otp }) {
  // Never log OTP value.
  console.log('[emailOtpDelivery] sendEmailOtp attempt', {
    toEmail: toEmail ? '[provided]' : '[missing]',
    toName: toName ? '[provided]' : '[missing]',
  });

  const html = buildOtpEmailHtml({
    toName,
    otp,
    purpose: 'verification',
    expiryMinutes: 5,
  });

  await sendTemplatedEmail({
    toEmail,
    toName,
    subject: 'InternArea - Email Verification OTP',
    html,
  });

  console.log('[emailOtpDelivery] sendEmailOtp success');
}

module.exports = { sendEmailOtp };
