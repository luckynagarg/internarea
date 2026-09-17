/**
 * IST (Indian Standard Time) utilities.
 *
 * Note on correctness:
 * The backend must enforce payment windows and monthly quota rules using
 * a consistent IST interpretation, independent from client timezone.
 */

// Timezone/window utilities for payment restrictions.
// Requirement: backend must enforce payments only between configured hours.
// Env-driven:
// - PAYMENT_TIMEZONE (default: Asia/Kolkata)
// - PAYMENT_START_HOUR (default: 10)
// - PAYMENT_END_HOUR (default: 11)
// Uses Intl to interpret a date in the target timezone.

function getZonedParts(date = new Date(), timeZone = 'Asia/Kolkata') {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = dtf.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return {
    year: Number(map.year),
    monthIndex: Number(map.month) - 1,
    day: Number(map.day),
    hours: Number(map.hour),
    minutes: Number(map.minute),
    seconds: Number(map.second),
  };
}

/**
 * Enforces allowed payment time window.
 *
 * Boundary policy:
 * - Start time inclusive (>= start)
 * - End time exclusive (< end)
 */
function isWithinPaymentWindowIST(date = new Date()) {
  // Keep exported name for backward compatibility.
  const timeZone = process.env.PAYMENT_TIMEZONE || 'Asia/Kolkata';
  const startHour = Number(process.env.PAYMENT_START_HOUR ?? 10);
  const endHour = Number(process.env.PAYMENT_END_HOUR ?? 11);

  const { hours, minutes, seconds } = getZonedParts(date, timeZone);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  const start = startHour * 3600;
  const end = endHour * 3600;

  return totalSeconds >= start && totalSeconds < end;
}


/**
 * Returns the current IST calendar month as an instant range.
 *
 * Output:
 * - start: inclusive
 * - endExclusive: exclusive
 */
function getISTMonthRange(now = new Date()) {
  const { year, monthIndex } = getZonedParts(now, 'Asia/Kolkata');
  const offset = 330 * 60 * 1000;
  return {
    start: new Date(Date.UTC(year, monthIndex, 1) - offset),
    endExclusive: new Date(Date.UTC(year, monthIndex + 1, 1) - offset),
  };
}

module.exports = { isWithinPaymentWindowIST, getISTMonthRange };


