const crypto = require('crypto');

const PaymentTransaction = require('../Model/PaymentTransaction');
const Subscription = require('../Model/Subscription');
const Invoice = require('../Model/Invoice');

const plans = require('../config/subscriptionPlans');

const { generateInvoicePdf } = require('./invoicePdfService');
const emailService = require('./emailService');
const { buildInvoiceEmailHtml } = require('./emailTemplates');
const { getActivePlanAndQuota } = require('./subscriptionService');

const { getRazorpayInstance } = require('./razorpayService');

function normalizePlanKey(planKey) {
  return String(planKey || '').toLowerCase();
}

function getPlanOrThrow(planKey) {
  const key = normalizePlanKey(planKey);
  const plan = plans[key];
  if (!plan) {
    const err = new Error('Invalid subscription plan.');
    err.statusCode = 400;
    throw err;
  }
  return plan;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    const err = new Error(`${name} is not configured.`);
    err.statusCode = 500;
    throw err;
  }
  return v;
}

async function createRazorpayOrder({ userId, planKey, userEmail, userName }) {
  const plan = getPlanOrThrow(planKey);

  // Free plan: no order/payment.
  if (plan.priceINR === 0) {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    await Subscription.updateOne(
      { userId },
      {
        $set: {
          userId,
          planKey: 'free',
          status: 'active',
          startDate,
          endDate,
          lastVerifiedPaymentId: null,
        },
      },
      { upsert: true }
    );

    return {
      orderId: null,
      amount: 0,
      currency: 'INR',
      planKey: 'free',
      subscriptionName: plan.name,
      transactionId: null,
      freeActivated: true,
    };
  }

  const razorpay = getRazorpayInstance();

  const amountPaise = plan.priceINR * 100;
  const currency = process.env.RAZORPAY_CURRENCY || 'INR';

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency,
    receipt: `internarea_${userId}_${Date.now()}`,
    payment_capture: 1,
  });

  // Create local payment transaction.
  // Activation happens only after verify.
  const txn = await PaymentTransaction.create({
    userId,
    planKey: plan.planKey,
    amount: plan.priceINR,
    currency,
    razorpayOrderId: order.id,
    razorpayPaymentId: null,
    razorpaySignature: null,
    status: 'created',
    invoiceNumber: null,
  });

  return {
    orderId: order.id,
    amount: plan.priceINR,
    currency,
    planKey: plan.planKey,
    subscriptionName: plan.name,
    transactionId: txn._id,
    keyId: process.env.RAZORPAY_KEY_ID || '',
  };
}

async function verifyAndActivate({ userId, planKey, razorpayOrderId, razorpayPaymentId, razorpaySignature, userEmail, userName }) {
  // Idempotency: if payment already verified for this user/order, return.
  const existing = await PaymentTransaction.findOne({ userId, razorpayOrderId, status: 'verified' });
  if (existing && existing.razorpayPaymentId === razorpayPaymentId) {
    return {
      alreadyActivated: true,
      subscription: await Subscription.findOne({ userId }).lean(),
      payment: {
        razorpayOrderId,
        razorpayPaymentId,
      },
    };
  }

  // Enforce the payment time window server-side (10:00–11:00 AM IST by default).
  const { isPaymentTimeAllowedNow } = require('../config/paymentWindow');
  if (!isPaymentTimeAllowedNow()) {
    const err = new Error('Payments are only accepted between 10:00 AM and 11:00 AM IST.');
    err.statusCode = 403;
    throw err;
  }

  // Look up the transaction to get the plan stored at order-creation time.
  // The frontend-supplied planKey is NOT trusted for activation decisions.
  const txn = await PaymentTransaction.findOne({ userId, razorpayOrderId });
  if (!txn) {
    const err = new Error('Payment order not found.');
    err.statusCode = 404;
    throw err;
  }

  // Use the planKey stored in the transaction as the source of truth.
  const storedPlanKey = txn.planKey || planKey;
  const plan = getPlanOrThrow(storedPlanKey);

  // Defense-in-depth: verify the transaction amount matches the plan price.
  if (txn.amount !== plan.priceINR) {
    await PaymentTransaction.updateOne(
      { _id: txn._id },
      { $set: { status: 'failed', failureReason: `Amount mismatch: expected ${plan.priceINR}, got ${txn.amount}.` } }
    );
    const err = new Error('Payment amount does not match plan.');
    err.statusCode = 400;
    throw err;
  }

  // Signature verification: SHA256 HMAC of orderId|paymentId using Razorpay key secret.
  const razorpayKeySecret = requireEnv('RAZORPAY_KEY_SECRET');

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac('sha256', razorpayKeySecret)
    .update(body)
    .digest('hex');

  if (expected !== razorpaySignature) {
    // Mark failed once.
    await PaymentTransaction.updateOne(
      { userId, razorpayOrderId },
      {
        $set: {
          status: 'failed',
          razorpayPaymentId,
          razorpaySignature,
          failureReason: 'Signature verification failed.',
        },
      }
    );

    const err = new Error('Payment verification failed.');
    err.statusCode = 400;
    err.publicMessage = 'Payment verification failed. Please try again.';
    throw err;
  }

  // Transactional-ish activation: best-effort atomic update.
  // Since current schema doesn’t include session transactions in the repo,
  // we rely on idempotent status checks + unique indexes later.
  const updateTxn = await PaymentTransaction.updateOne(
    { userId, razorpayOrderId, status: { $ne: 'verified' } },
    {
      $set: {
        status: 'verified',
        razorpayPaymentId,
        razorpaySignature,
        verifiedAt: new Date(),
      },
    }
  );

  // If nothing updated, it may have already been verified; re-read.
  const txnAfter = await PaymentTransaction.findOne({ userId, razorpayOrderId });

  // Activate subscription only once.
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  await Subscription.updateOne(
    { userId },
    {
      $set: {
        userId,
        planKey: plan.planKey,
        status: 'active',
        startDate,
        endDate,
        lastVerifiedPaymentId: razorpayPaymentId,
      },
    },
    { upsert: true }
  );

  // Invoice generation (unique number)
  const invoiceNumber = `INV-${userId.slice(0, 6).toUpperCase()}-${Date.now()}`;
  const invoicePdfPath = await generateInvoicePdf({
    invoiceNumber,
    userName: userName || '',
    userEmail: userEmail || '',
    planName: plan.name,
    amountPaid: plan.priceINR,
    paymentId: razorpayPaymentId,
    subscriptionStart: startDate,
    subscriptionExpiry: endDate,
  });

  // Prevent duplicate invoiceNumber by retry-safe upsert semantics.
  let invoice;
  try {
    invoice = await Invoice.create({
      userId,
      invoiceNumber,
      planKey: plan.planKey,
      amountPaid: plan.priceINR,
      currency: 'INR',
      paymentId: razorpayPaymentId,
      subscriptionStart: startDate,
      subscriptionExpiry: endDate,
      pdfPath: invoicePdfPath,
      emailStatus: 'pending',
      paymentMeta: {
        razorpayOrderId,
        razorpayPaymentId,
      },
    });
  } catch (e) {
    // If invoice exists (collision), reload.
    invoice = await Invoice.findOne({ userId, invoiceNumber });
  }

  await PaymentTransaction.updateOne({ _id: txnAfter?._id }, { $set: { invoiceNumber } });

// Best-effort email.
  try {
    const html = buildInvoiceEmailHtml({
      planName: plan.name,
      amountPaid: plan.priceINR,
      paymentId: razorpayPaymentId,
      invoiceNumber,
      startDate,
      expiryDate: endDate,
    });

    await emailService.sendInvoiceEmail({
      toEmail: userEmail,
      toName: userName,
      subject: `InternArea - Invoice ${invoiceNumber}`,
      html,
      attachments: [{ filename: `${invoiceNumber}.pdf`, path: invoicePdfPath }],
    });

    await Invoice.updateOne({ _id: invoice._id }, { $set: { emailStatus: 'sent' } });
  } catch (e) {
    await Invoice.updateOne({ _id: invoice._id }, { $set: { emailStatus: 'failed', emailFailureReason: e.message } });
  }

  const current = await getActivePlanAndQuota(userId);

  return {
    subscription: await Subscription.findOne({ userId }).lean(),
    invoice: {
      invoiceNumber,
      pdfPath: invoicePdfPath,
    },
    payment: {
      razorpayOrderId,
      razorpayPaymentId,
    },
    dashboard: {
      current,
    },
  };
}

// Webhook handler expects req to carry raw body.
// This project’s current server uses body-parser JSON, so correct raw-body
// wiring is required in server setup (Phase B follow-up).
async function handleRazorpayWebhook(req) {
  const webhookSecret = requireEnv('RAZORPAY_WEBHOOK_SECRET');
  const signature = req.headers['x-razorpay-signature'];

  if (!signature) {
    const err = new Error('Missing Razorpay webhook signature.');
    err.statusCode = 400;
    throw err;
  }

  const payload = req.rawBody || JSON.stringify(req.body);

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  if (expected !== signature) {
    const err = new Error('Invalid webhook signature.');
    err.statusCode = 400;
    throw err;
  }

  const event = typeof payload === 'string' ? JSON.parse(payload) : payload;

  // Event types support (best-effort, depends on Razorpay webhook payload shape)
  const eventType = event.event || event.event_type;
  const entity = event.payload || event;

  // Idempotency: match by payment id when available.
  const payment = entity.payment || entity;
  const order = entity.order || entity;

  const razorpayPaymentId = payment?.payment_id || payment?.id || entity?.payment_id || null;
  const razorpayOrderId = order?.order_id || entity?.order_id || null;

  if (!razorpayPaymentId && !razorpayOrderId) {
    return { ignored: true, reason: 'Missing orderId/paymentId in webhook.' };
  }

  // Idempotency (best-effort for this repo state):
  // - If payment is already in terminal state, ignore.
  const existing = razorpayPaymentId
    ? await PaymentTransaction.findOne({ razorpayPaymentId }).lean()
    : await PaymentTransaction.findOne({ razorpayOrderId }).lean();

  if (existing && (existing.status === 'verified' || existing.status === 'failed')) {
    return { processed: false, eventType, reason: 'Already in terminal state' };
  }

  if (eventType === 'payment.captured' && razorpayPaymentId) {
    await PaymentTransaction.updateOne(
      { razorpayPaymentId },
      { $set: { status: 'verified' } },
      { upsert: false }
    );
  }

  if (eventType === 'payment.failed' && razorpayPaymentId) {
    await PaymentTransaction.updateOne(
      { razorpayPaymentId },
      {
        $set: {
          status: 'failed',
          failureReason: payment?.error_description || 'Payment failed',
        },
      },
      { upsert: false }
    );
  }

  return { processed: true, eventType };
}



async function getSubscriptionHistory(userId) {
  const PaymentTransaction = require('../Model/PaymentTransaction');
  const history = await PaymentTransaction.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return history;
}

module.exports = {
  createRazorpayOrder,
  verifyAndActivate,
  handleRazorpayWebhook,
  getSubscriptionHistory,
};

