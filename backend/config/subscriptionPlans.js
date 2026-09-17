/**
 * Subscription plan definitions.
 *
 * Each plan defines:
 * - monthlyLimit: internship/job applications per IST month
 * - resumeLimit: number of premium resume creations
 * - friendLimit: maximum accepted friends
 * - postLimit: public-space posts per IST month
 * - storageLimitMB: Firebase storage quota in MB (soft guideline)
 */
module.exports = {
  free: {
    planKey: 'free',
    name: 'Free',
    priceINR: 0,
    monthlyLimit: 1,
    resumeLimit: 0,
    friendLimit: 50,
    postLimit: 5,
    storageLimitMB: 100,
  },
  bronze: {
    planKey: 'bronze',
    name: 'Bronze',
    priceINR: 100,
    monthlyLimit: 3,
    resumeLimit: 1,
    friendLimit: 150,
    postLimit: 15,
    storageLimitMB: 500,
  },
  silver: {
    planKey: 'silver',
    name: 'Silver',
    priceINR: 300,
    monthlyLimit: 5,
    resumeLimit: 3,
    friendLimit: 500,
    postLimit: 50,
    storageLimitMB: 2000,
  },
  gold: {
    planKey: 'gold',
    name: 'Gold',
    priceINR: 1000,
    monthlyLimit: Number.POSITIVE_INFINITY,
    resumeLimit: Number.POSITIVE_INFINITY,
    friendLimit: Number.POSITIVE_INFINITY,
    postLimit: Number.POSITIVE_INFINITY,
    storageLimitMB: Number.POSITIVE_INFINITY,
  },
};

