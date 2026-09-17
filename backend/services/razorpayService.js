const Razorpay = require('razorpay');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    const err = new Error(`${name} is not configured.`);
    err.statusCode = 500;
    throw err;
  }
  return value;
}

function getRazorpayInstance() {
  // Credentials must come ONLY from server-side environment variables.
  const missing = [];
  if (!process.env.RAZORPAY_KEY_ID) missing.push('RAZORPAY_KEY_ID');
  if (!process.env.RAZORPAY_KEY_SECRET) missing.push('RAZORPAY_KEY_SECRET');

  if (missing.length) {
    const err = new Error(`Missing Razorpay environment variable(s): ${missing.join(', ')}`);
    err.statusCode = 500;
    throw err;
  }

  // Razorpay constructor uses creds; test/live compatibility is handled by which keys
  // are provided via environment variables.
  return new Razorpay({
    key_id: requireEnv('RAZORPAY_KEY_ID'),
    key_secret: requireEnv('RAZORPAY_KEY_SECRET'),
  });
}


module.exports = { getRazorpayInstance };

