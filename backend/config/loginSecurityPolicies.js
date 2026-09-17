// Central, env-configurable login security policies.
// Keep defaults safe and backward-compatible.

function envBool(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return String(raw).toLowerCase() === 'true';
}

function envInt(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  const n = Number(raw);
  return Number.isFinite(n) ? n : defaultValue;
}

module.exports = {
  // Chrome email-OTP login step. This is an OPTIONAL extra anti-phishing
  // layer on top of Firebase authentication. It is opt-in (default OFF) so a
  // valid Firebase login navigates directly to the dashboard (acceptance
  // TEST 1). Set ENABLE_CHROME_OTP_POLICY=true in the deployment env to
  // re-enable the email-OTP step for Chrome/Edge logins; the frontend still
  // handles that flow gracefully (/verify-login-otp).
  ENABLE_CHROME_OTP_POLICY: envBool('ENABLE_CHROME_OTP_POLICY', false),
  ENABLE_MOBILE_TIME_POLICY: envBool('ENABLE_MOBILE_TIME_POLICY', true),

  // Mobile allowed window (IST)
  MOBILE_ALLOWED_START_HOUR_IST: envInt('MOBILE_ALLOWED_START_HOUR_IST', 10), // 10:00
  MOBILE_ALLOWED_END_HOUR_IST: envInt('MOBILE_ALLOWED_END_HOUR_IST', 13), // 13:00 (1:00PM)
  MOBILE_ALLOWED_START_MINUTE_IST: envInt('MOBILE_ALLOWED_START_MINUTE_IST', 0),
  MOBILE_ALLOWED_END_MINUTE_IST: envInt('MOBILE_ALLOWED_END_MINUTE_IST', 0),
};

