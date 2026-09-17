/**
 * Subscription service.
 *
 * This layer centralizes business rules:
 * - Determine the active subscription for a user (or fall back to Free)
 * - Expire subscriptions after 30 days (lazy evaluation)
 * - Compute monthly internship application quota based on the active plan
 *
 * It is intentionally used by backend routes so limits are enforced server-side.
 */
const Subscription = require('../Model/Subscription');
const Application = require('../Model/Application');
const plans = require('../config/subscriptionPlans');
const { getISTMonthRange } = require('../utils/ist');

/**
 * Normalizes a plan key coming from external input.
 *
 * The rest of the system expects lower-case keys.
 */
function normalizePlanKey(planKey) {
  return String(planKey || '').toLowerCase();
}

/**
 * Resolves a plan definition from the static plans config.
 *
 * If the planKey is unknown, we fall back to Free.
 */
function getMonthlyLimitForPlan(planKey) {
  const key = normalizePlanKey(planKey);
  const plan = plans[key];
  if (!plan) return plans.free;
  return plan;
}

/**
 * Ensures there is a subscription document for the user.
 *
 * Notes:
 * - The current implementation performs lazy expiration.
 * - If no valid subscription exists, it creates an active Free subscription
 *   for 30 days so downstream quota logic always has a subscription doc.
 */
async function ensureSubscriptionDocForUser(userId) {
  const now = new Date();

  // If existing active subscription exists, return it if it isn't expired.
  // Pick the user's BEST active subscription (latest endDate first). Sorting
  // ascending here previously made an older Free subscription shadow a newly
  // purchased bronze/silver/gold plan, so paid quotas never took effect.
  const active = await Subscription.findOne({ userId, status: 'active' }).sort({ endDate: -1 });

  if (active) {
    // Treat subscription as expired if endDate is strictly before now.
    if (active.endDate && active.endDate.getTime() >= now.getTime()) return active;

    // Mark as expired so we can recreate/correct state.
    await Subscription.updateOne({ _id: active._id }, { $set: { status: 'expired' } });
  }

  // Free plan lifecycle is still represented as a subscription doc.
  const freeStart = now;
  const freeEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const created = await Subscription.create({
    userId,
    planKey: 'free',
    status: 'active',
    startDate: freeStart,
    endDate: freeEnd,
    lastVerifiedPaymentId: null,
  });

  return created;
}

/**
 * Returns active plan + quota usage for the current IST calendar month.
 *
 * Why IST here?
 * - Monthly quota is defined as "per month" but the business operates in IST.
 * - This ensures quota boundaries are computed consistently on the server.
 */
async function getActivePlanAndQuota(userId) {
  const now = new Date();

  // Find the user's BEST active subscription (latest endDate first) so a
  // newly purchased paid plan always takes precedence over stale Free docs.
  let sub = await Subscription.findOne({ userId, status: 'active' }).sort({ endDate: -1 });

  // Lazy expiration: if an active sub has an endDate in the past, mark it expired.
  if (sub && sub.endDate && sub.endDate.getTime() < now.getTime()) {
    sub.status = 'expired';
    await sub.save();
    sub = null;
  }

  // If user has no subscription doc, fall back to Free by creating one.
  if (!sub) {
    sub = await Subscription.create({
      userId,
      planKey: 'free',
      status: 'active',
      startDate: now,
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });
  }

  const plan = getMonthlyLimitForPlan(sub.planKey);

  // Determine the current IST calendar month boundary range.
  const { start, endExclusive } = getISTMonthRange(now);

  // Count applications created within the IST month for quota enforcement.
  // We intentionally compute usage on the backend so users cannot bypass limits.
  const appCount = await Application.countDocuments({
    createdAt: { $gte: start, $lt: endExclusive },
    userId,
  });

  // A failed usage query must fail closed, not turn into a fresh allowance.
  const used = Number.isFinite(appCount) ? appCount : 0;

  const limit = plan.monthlyLimit;

  // Unlimited plans are represented by Infinity.
  const remaining =
    limit === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : Math.max(0, limit - used);

  return {
    planKey: plan.planKey,
    planName: plan.name,
    monthlyLimit: limit,
    applicationsUsed: used,
    remainingApplications: remaining,
    subscriptionStatus: sub.status,
    subscriptionStart: sub.startDate,
    subscriptionExpiry: sub.endDate,
    // Extended quota fields
    resumeLimit: plan.resumeLimit,
    friendLimit: plan.friendLimit,
    postLimit: plan.postLimit,
    storageLimitMB: plan.storageLimitMB,
  };
}

/**
 * Convenience wrapper used by routes that only need quota.
 */
async function getQuotaOnly(userId) {
  return getActivePlanAndQuota(userId);
}

module.exports = {
  normalizePlanKey,
  getMonthlyLimitForPlan,
  ensureSubscriptionDocForUser,
  getActivePlanAndQuota,
  getQuotaOnly,
};
