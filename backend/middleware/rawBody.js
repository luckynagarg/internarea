/**
 * Raw body middleware for webhook signature verification.
 *
 * IMPORTANT FIX: Previously this middleware consumed the request stream and
 * set req.rawBody, but did NOT mark the request as already parsed. When the
 * global `body-parser.json()` middleware ran afterwards, it found the stream
 * already consumed and could not parse req.body — leaving webhook handlers
 * with an empty body (breaking Razorpay signature verification).
 *
 * Fix:
 * - Parse the raw body into req.body ourselves (when JSON).
 * - Set req._body = true so body-parser SKIPS re-parsing the consumed stream.
 * - Always expose req.rawBody for HMAC signature verification.
 */

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function rawBodyMiddleware(req, res, next) {
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
    return next();
  }

  getRawBody(req)
    .then((raw) => {
      req.rawBody = raw;

      // Body-parser will skip this request because the stream is consumed.
      req._body = true;
      req.body = req.body || {};

      // If content-type is JSON, parse it into req.body for convenience.
      const contentType = String(req.headers['content-type'] || '');
      if (contentType.includes('application/json') && raw) {
        try {
          req.body = JSON.parse(raw);
        } catch {
          // Keep raw body for signature verification; leave body as-is.
        }
      }

      return next();
    })
    .catch(() => {
      res.status(400).json({ success: false, error: 'Unable to read raw request body' });
    });
}

module.exports = { rawBodyMiddleware, getRawBody };

