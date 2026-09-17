/**
 * Razorpay QR payment service.
 *
 * Generates a dynamic Razorpay payment QR. The Razorpay SDK exposes
 * `razorpay.qrCode` (Node SDK >= 2.0.9). We wrap it so the route can create a
 * QR that encodes the amount + subscription name + order/user metadata.
 */
const { getRazorpayInstance } = require('./razorpayService');

/**
 * Creates a dynamic payment QR via Razorpay.
 *
 * @param {Object} opts
 * @param {number} opts.amountPaise - amount in paise
 * @param {string} [opts.currency='INR']
 * @param {string} opts.description - e.g. "Bronze Subscription"
 * @param {string} [opts.reference] - internal reference
 * @param {string} [opts.userId] - authenticated user UID
 * @param {string} [opts.planKey]
 * @param {string} [opts.orderId] - optional Razorpay order id to bind
 * @returns {Promise<Object>} { id, qrUrl (image_url), upiId, reference, status }
 */
async function createPaymentQr({
  amountPaise,
  currency = 'INR',
  description = 'InternArea Payment',
  reference = null,
  userId = null,
  planKey = null,
  orderId = null,
}) {
  if (!amountPaise || amountPaise <= 0) {
    const err = new Error('amountPaise is required.');
    err.statusCode = 400;
    throw err;
  }

  const razorpay = getRazorpayInstance();

  const payload = {
    type: 'upi_qr',
    name: 'InternArea',
    usage: 'single_use',
    fixed_amount: true,
    payment_amount: Math.round(amountPaise),
    description: String(description).slice(0, 100),
    notes: {
      userId: userId || '',
      planKey: planKey || '',
      reference: reference || '',
      orderId: orderId || '',
    },
  };

  try {
    const qr = await razorpay.qrCode.create(payload);
    return {
      id: qr?.id || null,
      qrUrl: qr?.image_url || null,
      upiId: qr?.upi_id || null,
      reference: qr?.reference || null,
      status: qr?.status || 'active',
      amountPaise,
      currency,
      description: payload.description,
    };
  } catch (err) {
    // Razorpay may not have qrCode enabled on the account or SDK version.
    const e = new Error(
      `Unable to generate payment QR: ${err?.error?.description || err?.message || 'unknown'}`
    );
    e.statusCode = 502;
    throw e;
  }
}

module.exports = { createPaymentQr };
