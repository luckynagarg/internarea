const { badRequest } = require('../utils/httpErrors');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validateEmailInput(email) {
  const e = normalizeEmail(email);
  if (!e) throw badRequest('email is required');

  // Simple, safe email format check (not full RFC validation)
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  if (!ok) throw badRequest('Invalid email format');

  return e;
}

function validateOtpInput(otp) {
  const v = String(otp || '').trim();
  if (!v) throw badRequest('otp is required');

  // OTP must be 6 digits
  if (!/^\d{6}$/.test(v)) throw badRequest('Invalid otp format');

  return v;
}

module.exports = {
  validateEmailInput,
  validateOtpInput,
};

