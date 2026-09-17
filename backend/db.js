const mongoose = require("mongoose");

/**
 * Resolve the MongoDB connection string from the environment.
 *
 * Precedence (most-specific first):
 *   1. MONGODB_URI
 *   2. MONGO_URL
 *   3. MONGO_URI
 *   4. DATABASE_URL  (backward-compatible fallback)
 *
 * IMPORTANT (Render): When a Render PostgreSQL database is linked to a service,
 * Render AUTOMATICALLY injects `DATABASE_URL` as a `postgres://...` URI. That
 * injected value is NOT a MongoDB URI and will fail the scheme check below.
 * Using Mongo-specific names first avoids silently connecting to (or failing
 * on) the wrong database type.
 */
function resolveMongoUriFromEnv() {
  return (
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL
  );
}

/**
 * Normalize a MongoDB connection string coming from the environment.
 *
 * Fixes the two most common copy/paste failures that break Render deploys:
 *  1. Leading/trailing whitespace (invisible characters before "mongodb")
 *  2. Surrounding double/single quotes (e.g. value stored as "mongodb+srv://...")
 *
 * Returns the cleaned string, or the original value if it is not a string.
 */
function normalizeMongoUri(raw) {
  if (typeof raw !== "string") return raw;

  let uri = raw.trim();

  // Strip a single pair of matching surrounding quotes.
  if (
    uri.length >= 2 &&
    ((uri.startsWith('"') && uri.endsWith('"')) ||
      (uri.startsWith("'") && uri.endsWith("'")))
  ) {
    uri = uri.slice(1, -1).trim();
  }

  return uri;
}

/**
 * Extract ONLY the host portion of a MongoDB URI for safe logging.
 *
 *   "mongodb+srv://user:pass@cluster0.abc.mongodb.net/db?retryWrites=true"
 *     -> "cluster0.abc.mongodb.net"
 *
 * Credentials (user:pass@) are always stripped; passwords are never logged.
 */
function safeMongoHost(uri) {
  if (typeof uri !== "string" || !uri) return "(not set)";
  try {
    const afterScheme = uri.replace(/^mongodb(\+srv)?:\/\//i, "");
    const atIdx = afterScheme.indexOf("@");
    const hostAndMaybePath = atIdx >= 0 ? afterScheme.slice(atIdx + 1) : afterScheme;
    const hostPort = hostAndMaybePath.split(/[/?]/)[0];
    return hostPort || "(unknown)";
  } catch (_err) {
    return "(unparseable)";
  }
}

module.exports.connect = async () => {
  const rawUri = resolveMongoUriFromEnv();
  const uri = normalizeMongoUri(rawUri);

  // ----- Startup diagnostics (never print secrets) -----
  console.log("[db] Mongo connection string exists (DATABASE_URL or Mongo alias):", !!rawUri);
  if (rawUri) {
    console.log(
      "[db] connection string starts with mongodb:// :",
      /^mongodb:\/\//i.test(uri)
    );
    console.log(
      "[db] connection string starts with mongodb+srv:// :",
      /^mongodb\+srv:\/\//i.test(uri)
    );
    console.log("[db] connection string host:", safeMongoHost(uri));
  }

  if (!rawUri || !uri) {
    console.warn(
      "⚠️ No MongoDB connection string found. Set DATABASE_URL (or MONGODB_URI / MONGO_URL / MONGO_URI) on Render."
    );
    return { mongoAvailable: false, reason: "missing DATABASE_URL" };
  }

  // Validate the connection string scheme up-front so the failure reason is
  // actionable instead of Mongoose's generic "Invalid scheme" message.
  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    const reason =
      'DATABASE_URL is not a valid MongoDB connection string. It must start with "mongodb://" or "mongodb+srv://". ' +
      "Check the DATABASE_URL value set in your environment (Render dashboard > Environment). " +
      "Ensure there are no surrounding quotes and no leading/trailing spaces. " +
      "If a Render PostgreSQL database is linked to this service, Render overrides DATABASE_URL " +
      "with a postgres:// URI — unlink it or set MONGODB_URI to the Atlas URI instead.";
    console.warn("⚠️ Database connection failed. Mongo will be treated as unavailable:", reason);
    return { mongoAvailable: false, reason };
  }

  try {
    // Fail fast when the cluster is unreachable instead of buffering queries for 10s.
    // With bufferCommands:false, any query issued before the connection is ready will
    // immediately throw a MongooseError rather than silently buffering and timing out.
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      bufferCommands: false,
    });
    console.log("✅ Database is connected");
    console.log(`✅ Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
    return { mongoAvailable: true };
  } catch (err) {
    console.warn("⚠️ Database connection failed. Mongo will be treated as unavailable:", err.message);
    return { mongoAvailable: false, reason: err.message };
  }
};

module.exports.resolveMongoUriFromEnv = resolveMongoUriFromEnv;
module.exports.normalizeMongoUri = normalizeMongoUri;
module.exports.safeMongoHost = safeMongoHost;


