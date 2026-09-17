/**
 * Application quota service.
 *
 * Single, reusable source of truth for the monthly internship/job application
 * allowance. Enforced ONLY on the backend:
 *
 *   FREE   = 1 application / month
 *   BRONZE = 3 applications / month
 *   SILVER = 5 applications / month
 *   GOLD   = unlimited
 *
 * The plan, the current billing month window and the number of applications are
 * all resolved from MongoDB — never from client input, Redux state or headers.
 */
const subscriptionService = require('./subscriptionService');
const { getISTMonthRange } = require('../utils/ist');

const CODE_QUOTA_EXCEEDED = 'APPLICATION_QUOTA_EXCEEDED';

/**
 * Reads the authenticated user's effective plan + current-month usage.
 *
 * @param {string} userId Firebase UID from the verified ID token.
 */
async function getQuota(userId) {
  const quota = await subscriptionService.getActivePlanAndQuota(userId);

  const rawLimit = quota.monthlyLimit;
  const unlimited = !Number.isFinite(rawLimit) || rawLimit === Number.POSITIVE_INFINITY;
  const used = Number.isFinite(quota.applicationsUsed) ? quota.applicationsUsed : 0;
  const limit = unlimited ? null : rawLimit;

  const { start, endExclusive } = getISTMonthRange(new Date());

  return {
    planKey: quota.planKey,
    plan: String(quota.planKey || 'free').toUpperCase(),
    planName: quota.planName,
    used,
    limit,
    unlimited,
    remaining: unlimited ? null : Math.max(0, (limit || 0) - used),
    subscriptionStatus: quota.subscriptionStatus,
    subscriptionStart: quota.subscriptionStart,
    subscriptionExpiry: quota.subscriptionExpiry,
    periodStart: start,
    periodEndExclusive: endExclusive,
  };
}

/** True when the user has no applications left this month. */
function isExhausted(quota) {
  if (quota.unlimited) return false;
  return quota.used >= (quota.limit ?? 0);
}

/** Response body for a rejected application (HTTP 403). */
function quotaExceededPayload(quota) {
  return {
    success: false,
    code: CODE_QUOTA_EXCEEDED,
    message: 'Monthly application limit reached.',
    plan: quota.plan,
    used: quota.used,
    limit: quota.limit,
    unlimited: quota.unlimited,
  };
}

/** Compact quota summary attached to successful responses. */
function quotaInfoPayload(quota) {
  return {
    plan: quota.plan,
    used: quota.used,
    limit: quota.limit,
    unlimited: quota.unlimited,
  };
}

module.exports = {
  CODE_QUOTA_EXCEEDED,
  getQuota,
  isExhausted,
  quotaExceededPayload,
  quotaInfoPayload,
};
