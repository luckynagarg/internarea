/**
 * Main backend entry point.
 *
 * Responsibilities:
 * - Configure CORS and body parsing
 * - Install global middleware (rate limiting)
 * - Mount feature routes under /api
 * - Install centralized error handler
 * - Connect to MongoDB
 * - Validate SMTP configuration and verify email transport on startup
 */
// Load environment variables FIRST so every module (db, firebaseAdmin, services)
// reading process.env at require-time sees the correct values.
const dotenvResult = require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const {
  connect,
  resolveMongoUriFromEnv,
  normalizeMongoUri,
  safeMongoHost,
} = require("./db");
const router = require("./Routes/index");
const { errorHandler } = require("./middleware/errorHandler");
const { validateResendEnvVars } = require("./services/emailService");

// ============================================================
// Startup diagnostics — NEVER log passwords or secret values.
// ============================================================
function logStartupDiagnostics() {
  const dotenvLoaded = !!(dotenvResult && dotenvResult.parsed);
  console.log(
    "[startup] dotenv loaded:",
    dotenvLoaded ? "yes (.env parsed)" : "no (.env absent; using process env)"
  );

  console.log("[startup] DATABASE_URL exists:", !!process.env.DATABASE_URL);

  const rawUri = resolveMongoUriFromEnv();
  const uri = normalizeMongoUri(rawUri);

  console.log("[startup] Mongo connection string resolved:", !!uri);
  if (uri) {
    console.log(
      "[startup] starts with mongodb:// :",
      /^mongodb:\/\//i.test(uri)
    );
    console.log(
      "[startup] starts with mongodb+srv:// :",
      /^mongodb\+srv:\/\//i.test(uri)
    );
    console.log("[startup] Mongo host:", safeMongoHost(uri));
  }
}

// Print environment diagnostics immediately at startup.
logStartupDiagnostics();

const app = express();

// Create HTTP server (needed for Socket.IO).
const http = require("http");
const server = http.createServer(app);

// Initialize Socket.IO for realtime messaging.
const { initSocketServer } = require("./services/socketService");
initSocketServer(server, {
  corsOrigin: process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS
        .split(",")
        .map((s) => sanitizeOrigin(s))
        .filter(Boolean)
    : [sanitizeOrigin(process.env.FRONTEND_URL) || "http://localhost:3000"],
});

// Security headers via helmet (production-grade defaults)
const helmet = require("helmet");
app.use(helmet());

// Global process-level error guards.
// Prevents a single unhandled promise rejection / uncaught exception from
// silently crashing the process (which Render would report as 503/unavailable).
process.on("unhandledRejection", (reason, promise) => {
  console.error("[process] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[process] Uncaught Exception:", err?.stack || err);
});

// Render / Express proxy deployments require trust proxy for correct client IP handling.
// This prevents issues with rate-limit / forwarded-for parsing.
app.set('trust proxy', 1);


const port = process.env.PORT || 5000;

const environment = process.env.NODE_ENV || "development";

// CORS allowlist
// - FRONTEND_URL / CORS_ORIGIN (single) are treated as an extra value if provided.
// - CORS_ALLOWED_ORIGINS can provide a comma-separated full list and takes precedence.

/**
 * Normalize a single origin string from the environment into a plain URL.
 *
 * Handles the common copy/paste accidents that break CORS silently:
 *   - Markdown links:  "[https://a.com](https://a.com)"  -> "https://a.com"
 *   - Surrounding quotes: '"https://a.com"'              -> "https://a.com"
 *   - Square brackets / stray parens around the URL
 *   - Trailing slash (browsers never send one in the Origin header)
 *   - Leading/trailing whitespace
 *
 * Returns the cleaned origin, or null when the value is not a usable URL.
 */
function sanitizeOrigin(raw) {
  if (typeof raw !== "string") return null;
  let v = raw.trim();
  if (!v) return null;

  // Strip one pair of matching surrounding quotes.
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    v = v.slice(1, -1).trim();
  }

  // Markdown link form: [label](url) -> url
  const md = v.match(/^\[([^\]]*)\]\(([^)]+)\)$/);
  if (md) {
    v = md[2].trim();
  }

  // Remove any stray markdown/bracket characters.
  v = v.replace(/[\[\]()]/g, "").trim();

  // Strip a single trailing slash (origins never include a path).
  if (v.length > 1 && v.endsWith("/")) {
    v = v.slice(0, -1);
  }

  // Must be a plain http(s) origin to be usable for CORS.
  if (!/^https?:\/\/[^\s/]+$/i.test(v)) return null;

  return v;
}

const frontendUrl = sanitizeOrigin(process.env.FRONTEND_URL || process.env.CORS_ORIGIN);

const corsAllowedOriginsFromEnv = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS
      .split(",")
      .map((s) => sanitizeOrigin(s))
      .filter(Boolean)
  : [];

const defaultAllowedOrigins = [
  "https://internarea-one.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

// Ensure Render frontend (if provided) can pass without custom env wiring.
// (Does not break existing deployments; harmless if unused.)
const renderFrontendFallback = "https://internshala-clone-y2p2.onrender.com";



const allowedOriginsSet = new Set([

  ...(corsAllowedOriginsFromEnv.length ? corsAllowedOriginsFromEnv : defaultAllowedOrigins),
  ...(frontendUrl ? [frontendUrl] : []),
  // keep historical value (harmless if not used)
  "https://internarea-nine.vercel.app",
  ...(renderFrontendFallback ? [renderFrontendFallback] : []),
]);


const allowedOrigins = Array.from(allowedOriginsSet);

// Always apply CORS middleware first
const corsOptions = {
  origin: function (origin, callback) {
    // non-browser requests (no Origin) should pass
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // If not allowed, still allow request to reach routes so we can return JSON.
    // CORS headers will not be set, so browsers will block (correct behavior).
    return callback(null, false);
  },

  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
  ],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Ensure Access-Control-* headers exist for ALL responses (including 404/500 and errors)
// by applying an early middleware that sets allow headers when Origin is allowlisted.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) return next();

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,PATCH,OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type,Authorization,Accept,X-Requested-With"
    );

    // credentials=true requires explicit allow-credentials
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  return next();
});

// Raw body middleware for webhook signature verification
const { rawBodyMiddleware } = require('./middleware/rawBody');
app.post('/api/subscriptions/webhook', rawBodyMiddleware);

// Body parsing — hard cap the payload size to limit abuse / DoS via oversized bodies.
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));


const buildRateLimiter = require("./middleware/rateLimit");
app.use(buildRateLimiter());

// Basic health routes
app.get("/", (req, res) => {
  res.send("backend running");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, routes: ["/api/job", "/api/internship"] });
});

// Diagnostic endpoint for deployed route mounting.
// Disabled in production: it leaks the deployment environment and internal route
// table to anyone. Ops can rely on the health endpoint instead.
if (process.env.NODE_ENV !== 'production') {
  app.get("/api/routes", (req, res) => {
    res.json({
      ok: true,
      environment,
      mounted: {
        "GET /api/job": "handled",
        "POST /api/job": "handled",
        "GET /api/job/:id": "handled",
        "GET /api/internship": "handled",
        "POST /api/internship": "handled",
        "GET /api/internship/:id": "handled",
        "GET /api/application": "handled",
        "POST /api/application": "handled",
        "GET /api/public": "handled",
      },
    });
  });
}

app.use("/api", router);

// Error handler must be after routes
app.use(errorHandler);

// Serve uploaded files (chat images, etc.) statically.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect to MongoDB BEFORE listening. In production, fail fast if Mongo is down
// so Render restarts the service and we never serve traffic against an unconnected DB.
(async () => {
  const result = await connect();
  app.locals.mongoAvailable = !!result?.mongoAvailable;

  if (!result?.mongoAvailable) {
    const reason = result?.reason || 'unknown';
    console.warn(
      '[startup] MongoDB is NOT available. Reason:',
      reason
    );

    // In production, a missing/unreachable database is a fatal startup condition.
    // Render will see the non-zero exit and mark the deploy as failed, signalling
    // the operator to fix DATABASE_URL before traffic is served.
    if (process.env.NODE_ENV === 'production') {
      console.error('[startup] Fatal: MongoDB unavailable in production. Exiting.');
      process.exit(1);
    }
  }

  // Validate Firebase Admin environment on startup.
  // If Firebase Admin can't initialize, every protected route will fail with 503.
  try {
    const { getAdminOrThrow } = require('./config/firebaseAdmin');
    getAdminOrThrow();
    console.log('[startup] Firebase Admin: initialized OK');
  } catch (err) {
    console.warn('[startup] Firebase Admin NOT initialized:', err.message);
    // Provide actionable guidance on exactly which env var(s) are missing.
    const hasJson = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    const hasPath = !!process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const hasIndividual =
      !!process.env.FIREBASE_PROJECT_ID &&
      !!process.env.FIREBASE_CLIENT_EMAIL &&
      !!process.env.FIREBASE_PRIVATE_KEY;

    if (hasPath && !hasJson && !hasIndividual) {
      const p = String(process.env.FIREBASE_SERVICE_ACCOUNT_PATH).trim();
      const fs = require('fs');
      const path = require('path');
      const resolved = /^([a-zA-Z]:[\\/]|\/)/.test(p)
        ? p
        : path.join(__dirname, p);
      console.warn(
        `[startup]   -> FIREBASE_SERVICE_ACCOUNT_PATH is set but file ${
          fs.existsSync(resolved) ? 'EXISTS' : 'DOES NOT EXIST'
        }: ${resolved}`
      );
    } else if (!hasJson && !hasPath && !hasIndividual) {
      console.warn(
        '[startup]   -> Set FIREBASE_SERVICE_ACCOUNT (JSON), FIREBASE_SERVICE_ACCOUNT_PATH (file), or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.'
      );
    }
    console.warn('[startup] Protected routes (/api/notifications, /api/resume/my-resumes, /api/login/history, etc.) will return 503 until Firebase Admin is configured.');
  }

  // Validate Resend environment variables on startup.
  // - Fully configured  -> success message.
  // - Partially configured (e.g. RESEND_API_KEY set but EMAIL_FROM missing)
  //   -> clear warning; sendEmail() falls back to Gmail SMTP automatically.
  // - Never prints secret values, only variable NAMES.
  try {
    validateResendEnvVars();
    console.log('[startup] Resend environment variables: OK');
    console.log('[startup] Email service ready');
  } catch (err) {
    const hasApiKey = !!process.env.RESEND_API_KEY;
    if (hasApiKey) {
      console.warn(
        '[startup] Resend partially configured:',
        err.message
      );
      console.warn(
        '[startup] The From address will fall back to EMAIL_FROM_NAME + SMTP_FROM_EMAIL/SMTP_USER, and delivery falls back to Gmail SMTP when Resend rejects a send.'
      );
      console.warn('[startup] Email service ready (fallback SMTP active)');
    } else {
      console.warn('[startup] Resend configuration issue:', err.message);
      console.warn(
        '[startup] Email sending will use the Gmail SMTP fallback; set the missing variables to enable Resend.'
      );
      console.log('[startup] Email service ready (SMTP fallback)');
    }
  }

  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${environment}`);
  console.log(`Allowed CORS origins: ${JSON.stringify(allowedOrigins)}`);
  console.log(
    `Mounted diagnostic routes: /api/routes, /api/health, /api/job, /api/internship`
  );

  server.listen(port, () => {
    console.log(`Listening on ${port}`);
  });
})();
