/**
 * Login OTP email delivery service.
 *
 * Uses the professional OTP email template from emailTemplates.js.
 */

const { sendTemplatedEmail, buildOtpEmailHtml } = require('./emailTemplates');

async function sendLoginOtpEmail({ toEmail, toName, otp }) {
  console.log('[loginEmailOtp] sendLoginOtpEmail attempt', {
    toEmail: toEmail ? '[provided]' : '[missing]',
    toName: toName ? '[provided]' : '[missing]',
  });

  const html = buildOtpEmailHtml({
    toName,
    otp,
    purpose: 'login',
    expiryMinutes: 5,
  });

  await sendTemplatedEmail({
    toEmail,
    toName,
    subject: 'InternArea - Login Verification OTP',
    html,
  });

  console.log('[loginEmailOtp] sendLoginOtpEmail success');
}

module.exports = { sendLoginOtpEmail };
