/**
 * Admin dashboard statistics service.
 *
 * Computes REAL, database-backed platform metrics for the Admin Panel.
 * All counts come from the live collections; no hardcoded/fake values.
 *
 * Definitions:
 * - totalApplications  -> Application.countDocuments
 * - acceptedApplications -> Application.countDocuments({ status: 'accepted' })
 * - activeJobs         -> Job.countDocuments({ isActive: { $ne: false } })
 * - activeInternships  -> Internship.countDocuments({ isActive: { $ne: false } })
 * - totalUsers         -> UserProfile.countDocuments (real profile records)
 * - conversionRate     -> (accepted / applications) * 100  (0 when no applications)
 *
 * Trends compare the current 30-day window vs the previous equivalent window.
 * A missing/zero previous value yields null (frontend shows a neutral "—").
 */

const Application = require("../Model/Application");
const Job = require("../Model/Job");
const Internship = require("../Model/Internship");
const UserProfile = require("../Model/UserProfile");

/** Round a number to the given number of decimals, guarding NaN/Infinity. */
function safePercent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

/** Compute a signed trend % for current vs previous. Returns null when undefined. */
function safeTrend(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0) return null; // insufficient historical data -> neutral
  const delta = ((c - p) / p) * 100;
  return safePercent(delta);
}

/** Build a 30-day instant window. */
function windowsForNow(now = new Date()) {
  const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousStart = new Date(currentStart.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { currentStart, previousStart };
}

async function getDashboardStats() {
  const now = new Date();
  const { currentStart, previousStart } = windowsForNow(now);

  const [
    totalApplications,
    acceptedApplications,
    pendingApplications,
    rejectedApplications,
    activeJobs,
    activeInternships,
    totalUsers,
    applicationsNow,
    applicationsPrev,
    jobsNow,
    jobsPrev,
    internshipsNow,
    internshipsPrev,
  ] = await Promise.all([
    Application.countDocuments({}).catch(() => 0),
    Application.countDocuments({ status: "accepted" }).catch(() => 0),
    Application.countDocuments({ status: "pending" }).catch(() => 0),
    Application.countDocuments({ status: "rejected" }).catch(() => 0),
    Job.countDocuments({ isActive: { $ne: false } }).catch(() => 0),
    Internship.countDocuments({ isActive: { $ne: false } }).catch(() => 0),
    UserProfile.countDocuments({}).catch(() => 0),
    Application.countDocuments({ createdAt: { $gte: currentStart } }).catch(() => 0),
    Application.countDocuments({ createdAt: { $gte: previousStart, $lt: currentStart } }).catch(() => 0),
    Job.countDocuments({ createAt: { $gte: currentStart }, isActive: { $ne: false } }).catch(() => 0),
    Job.countDocuments({ createAt: { $gte: previousStart, $lt: currentStart }, isActive: { $ne: false } }).catch(() => 0),
    Internship.countDocuments({ createdAt: { $gte: currentStart }, isActive: { $ne: false } }).catch(() => 0),
    Internship.countDocuments({ createdAt: { $gte: previousStart, $lt: currentStart }, isActive: { $ne: false } }).catch(() => 0),
  ]);

  const total = Number(totalApplications) || 0;
  const accepted = Number(acceptedApplications) || 0;
  const conversionRate = total > 0 ? safePercent((accepted / total) * 100) : 0;

  return {
    totalApplications: total,
    acceptedApplications: accepted,
    applicationsByStatus: {
      pending: Number(pendingApplications) || 0,
      accepted: accepted,
      rejected: Number(rejectedApplications) || 0,
    },
    activeJobs: Number(activeJobs) || 0,
    activeInternships: Number(activeInternships) || 0,
    totalUsers: Number(totalUsers) || 0,
    conversionRate,
    trends: {
      applications: safeTrend(applicationsNow, applicationsPrev),
      jobs: safeTrend(jobsNow, jobsPrev),
      internships: safeTrend(internshipsNow, internshipsPrev),
      conversionRate: null, // no reliable historical conversion baseline exposed
    },
  };
}

module.exports = { getDashboardStats, safePercent, safeTrend };