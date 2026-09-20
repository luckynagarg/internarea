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
  // Chrome email-OTP login step. This is a MANDATORY security layer for
  // Chrome/Edge logins: a Chrome user MUST verify an email OTP before the
  // server grants dashboard access. It defaults to ON, and a missing
  // environment variable must never allow Chrome logins to bypass OTP.
  // Operators may explicitly set ENABLE_CHROME_OTP_POLICY=false only for
  // backwards-compatible local configuration. The frontend already handles
  // the flow (/verify-login-otp).
  ENABLE_CHROME_OTP_POLICY: envBool('ENABLE_CHROME_OTP_POLICY', true),
  ENABLE_MOBILE_TIME_POLICY: envBool('ENABLE_MOBILE_TIME_POLICY', true),

  // Mobile allowed window (IST)
  MOBILE_ALLOWED_START_HOUR_IST: envInt('MOBILE_ALLOWED_START_HOUR_IST', 10), // 10:00
  MOBILE_ALLOWED_END_HOUR_IST: envInt('MOBILE_ALLOWED_END_HOUR_IST', 13), // 13:00 (1:00PM)
  MOBILE_ALLOWED_START_MINUTE_IST: envInt('MOBILE_ALLOWED_START_MINUTE_IST', 0),
  MOBILE_ALLOWED_END_MINUTE_IST: envInt('MOBILE_ALLOWED_END_MINUTE_IST', 0),
};

