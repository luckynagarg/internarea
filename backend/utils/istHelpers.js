/**
 * Shared IST utilities.
 *
 * This module exists to avoid circular dependencies and keep date logic consistent
 * across login window enforcement and login history display.
 */

function toISTParts(date = new Date()) {
  // Date.getTime() already represents UTC; do not apply the host timezone twice.
  const istMs = date.getTime() + 5.5 * 60 * 60000;
  const ist = new Date(istMs);

  return {
    year: ist.getUTCFullYear(),
    monthIndex: ist.getUTCMonth(), // 0-11
    day: ist.getUTCDate(),
    hours: ist.getUTCHours(),
    minutes: ist.getUTCMinutes(),
    seconds: ist.getUTCSeconds(),
  };
}

// IST is UTC+05:30 all year (no DST), so a fixed offset is exact.
const IST_OFFSET_MS = 5.5 * 60 * 60000;

/**
 * Calendar day key (YYYY-MM-DD) for an instant, evaluated in IST.
 *
 * Used for "once per calendar day" / "per day" business rules so the result is
 * independent from the server's own timezone.
 */
function getISTDayKey(date = new Date()) {
  const { year, monthIndex, day } = toISTParts(date);
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * The UTC instant at which the IST calendar day containing `date` starts
 * (i.e. IST 00:00:00). Useful for atomic "new day?" range comparisons in Mongo.
 */
function getISTDayStartInstant(date = new Date()) {
  const { year, monthIndex, day } = toISTParts(date);
  return new Date(Date.UTC(year, monthIndex, day) - IST_OFFSET_MS);
}

/**
 * The UTC instant at which the IST calendar day containing `date` ends
 * (exclusive) — i.e. the next IST midnight.
 */
function getISTDayEndInstant(date = new Date()) {
  return new Date(getISTDayStartInstant(date).getTime() + 24 * 60 * 60000);
}

module.exports = {
  toISTParts,
  getISTDayKey,
  getISTDayStartInstant,
  getISTDayEndInstant,
};

