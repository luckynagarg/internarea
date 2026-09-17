const asyncHandler = require('../middleware/asyncHandler');
const { badRequest } = require('../utils/httpErrors');
const { validateEmailInput, validateOtpInput } = require('../validation/emailOtpValidation');
const { startEmailOtpChallenge, verifyEmailOtp } = require('../services/emailOtpService');
const { sendEmailOtp } = require('../services/emailOtpDeliveryService');

// POST /start
const start = asyncHandler(async (req, res) => {
  const { email, name } = req.body || {};
  const normalizedEmail = validateEmailInput(email);

  const { otp, otpExpiresAt } = await startEmailOtpChallenge({ email: normalizedEmail });

  // Send OTP email
  await sendEmailOtp({ toEmail: normalizedEmail, toName: name || '', otp });

  const expiresInSeconds = Math.max(
    0,
    Math.floor((otpExpiresAt.getTime() - Date.now()) / 1000)
  );

  // Do not return the OTP.
  return res.status(200).json({
    success: true,
    otpRequired: true,
    message: 'OTP sent.',
    expiresInSeconds,
  });
});

// POST /resend
const resend = asyncHandler(async (req, res) => {
  // For now, resend uses the same logic as start.
  return start(req, res);
});

// POST /verify
const verify = asyncHandler(async (req, res) => {
  const { email, otp } = req.body || {};
  const normalizedEmail = validateEmailInput(email);
  const normalizedOtp = validateOtpInput(otp);

  const result = await verifyEmailOtp({ email: normalizedEmail, otp: normalizedOtp });

  if (!result?.verified) throw badRequest('OTP verification failed');

  return res.status(200).json({
    success: true,
    verified: true,
    accessGranted: true,
    message: 'OTP verified. Email authentication complete.',
  });
});

module.exports = { start, resend, verify };

