/**
 * OTP email delivery for resume creation.
 *
 * Uses the professional OTP email template.
 */

const { sendTemplatedEmail, buildOtpEmailHtml } = require('./emailTemplates');

async function sendOtpEmail({ toEmail, toName, otp }) {
  console.log('[otpEmail] sendOtpEmail attempt', {
    toEmail: toEmail ? '[provided]' : '[missing]',
    toName: toName ? '[provided]' : '[missing]',
  });

  const html = buildOtpEmailHtml({
    toName,
    otp,
    purpose: 'resumeCreation',
    expiryMinutes: 10,
  });

  await sendTemplatedEmail({
    toEmail,
    toName,
    subject: 'InternArea - Resume Creation OTP Verification',
    html,
  });

  console.log('[otpEmail] sendOtpEmail success');
}


async function sendOtpSms({ phoneNumber, otp }) {
  // SMS architecture stub.
  throw new Error('sendOtpSms is not wired yet. Integrate Firebase/SMS provider.');
}

module.exports = { sendOtpEmail, sendOtpSms };
