/**
 * Payment time window (IST) enforcement.
 *
 * Business rule: paid subscription/resume activation is only allowed during a
 * daily IST window (default 10:00–11:00 AM IST). This is enforced server-side so
 * a client cannot activate a plan by skipping the frontend.
 *
 * Configuration (all optional):
 *   ENABLE_PAYMENT_TIME_WINDOW    = "true" | "false"  (default "true")
 *   PAYMENT_TIMEZONE              = IANA tz           (default "Asia/Kolkata")
 *   PAYMENT_ALLOWED_START_HOUR_IST / _MINUTE_IST      (default 10:00)
 *   PAYMENT_ALLOWED_END_HOUR_IST   / _MINUTE_IST      (default 11:00, exclusive)
 */

function istParts(date = new Date()) {
  const timeZone = process.env.PAYMENT_TIMEZONE || "Asia/Kolkata";
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    hours: Number(map.hour) || 0,
    minutes: Number(map.minute) || 0,
    seconds: Number(map.second) || 0,
  };
}

function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {Date} [date] - the instant to evaluate (defaults to now).
 * @returns {boolean} true if paid activation is allowed at the given time.
 */
function isPaymentTimeAllowedNow(date = new Date()) {
  // Operators may explicitly disable the window restriction.
  const enabledRaw = process.env.ENABLE_PAYMENT_TIME_WINDOW;
  if (enabledRaw !== undefined && String(enabledRaw).toLowerCase() === "false") {
    return true;
  }

  const startH = envInt("PAYMENT_ALLOWED_START_HOUR_IST", 10);
  const startM = envInt("PAYMENT_ALLOWED_START_MINUTE_IST", 0);
  const endH = envInt("PAYMENT_ALLOWED_END_HOUR_IST", 11);
  const endM = envInt("PAYMENT_ALLOWED_END_MINUTE_IST", 0);

  const { hours, minutes, seconds } = istParts(date);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const start = startH * 3600 + startM * 60;
  const end = endH * 3600 + endM * 60;

  // Inclusive start, exclusive end.
  return totalSeconds >= start && totalSeconds < end;
}

module.exports = { isPaymentTimeAllowedNow };