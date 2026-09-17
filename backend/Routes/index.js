/**
 * Central API route registry.
 *
 * All route modules are mounted under /api by backend/index.js.
 * Keeping this file small makes it easy to reason about API surface.
 */
const express = require("express");
const router = express.Router();

// Feature routes
const admin = require("./admin");
const intern = require("./internship");
const job = require("./job");
const application = require("./application.js");
const publicRoutes = require("./public");
const debugSeed = require('./debugSeed');

// Debug/seed router — DEV ONLY. Never expose seeding capabilities in production:
// an unauthenticated attacker could forge friendships, posts, likes and bypass
// the friend-based posting limits.
if (process.env.NODE_ENV !== 'production') {
  router.use('/debug', debugSeed);
}
const subscription = require("./subscription");
const passwordRecovery = require("./passwordRecovery");
const login = require("./login");
const resumeCreation = require("./resumeCreation");
const search = require("./search");

const { verifyFirebaseIdToken } = require("../middleware/authFirebase");
const { requireAdmin } = require("../middleware/requireAdmin");

// Admin endpoints
const { requireAdminAccess } = require("../middleware/adminSession");

// /api/admin/adminlogin remains unprotected (login gate). All other admin
// routes accept EITHER a server-signed admin session token (username/password
// login) OR a Firebase ID token with the admin custom claim.
// Chain: auth gate → admin router → login-history router → export router.
router.use("/admin", (req, res, next) => {
  if (req.path === "/adminlogin") return next();
  return requireAdminAccess(req, res, next);
});
router.use("/admin", admin);

// Admin applications + jobs/internships management (protected by /admin guard above).
// NOTE: adminApplications defines "/" as its list route, so it must be mounted
// under /admin/applications — mounting it at /admin made every
// /api/admin/applications request 404.
const adminApplications = require("./adminApplications");
const adminContent = require("./adminContent");
router.use("/admin/applications", adminApplications);
router.use("/admin", adminContent);

// Job & internship CRUD
router.use("/internship", intern);
router.use("/job", job);


// Applications (includes subscription quota enforcement for POST)
router.use("/application", application);

// Social / notifications
const friends = require("./friends");
const notifications = require("./notifications");
router.use("/friends", friends);
router.use("/notifications", notifications);

// Private messaging (1-to-1 conversations + messages)
const messages = require("./messages");
router.use("/messages", messages);


// Authenticated image upload to Supabase Storage (replaces Firebase Storage)
const upload = require("./upload");
router.use("/upload", upload);

// Public/community endpoints
router.use("/public", publicRoutes);

// User search / public profiles / nickname availability
const users = require("./users");
router.use("/users", users);

// User profile bootstrap (lazy-create UserProfile docs for Firebase users)
const profile = require("./profile");
router.use("/profile", profile);

// Password recovery endpoints
router.use("/password-recovery", passwordRecovery);

// Forgot password (generate new random password in Firebase Auth)
const forgotPassword = require('./forgotPassword');
router.use('/auth', forgotPassword);

// Subscription & billing endpoints (legacy)
router.use("/subscription", subscription);


// Enterprise subscriptions endpoints (Phase B)
const subscriptionsV2 = require('./subscriptions');
router.use('/subscriptions', subscriptionsV2);


// Login security (Chrome OTP) & login history
router.use("/login", login);

// Generic Email OTP authentication (separate module; does not affect /login/*)
const emailOtpAuth = require('./emailOtpAuth');
router.use('/email-otp-auth', emailOtpAuth);


// Admin security endpoints (auth already applied by /admin chain above).
const adminLoginHistory = require('./adminLoginHistory');
const adminLoginHistoryExport = require('./adminLoginHistoryExport');
router.use('/admin', adminLoginHistory);
router.use('/admin/login-history', adminLoginHistoryExport);



// Premium resume creation
router.use('/resume', resumeCreation);

// Search (internships/jobs/companies)
router.use('/search', search);

// Companies list (derived from internships + jobs)
router.use('/companies', search);

// Contact/Query form (forwards to admin email luckynagar1505@gmail.com)
const contact = require('./contact');
router.use('/contact', contact);

// Admin password reset (OTP-based, reuses existing email infrastructure)
const adminPasswordReset = require('./adminPasswordReset');
router.use('/admin/reset-password', adminPasswordReset);

// Email verification (Firebase built-in verification link)
const emailVerification = require('./emailVerification');
router.use('/email-verification', emailVerification);

// Language OTP (French language switch verification)
const languageOtp = require('./languageOtp');
router.use('/language', languageOtp);

module.exports = router;

