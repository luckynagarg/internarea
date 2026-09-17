/**
 * Enterprise subscriptions & billing routes (Razorpay).
 *
 * Requirement mapping:
 * - POST /api/subscriptions/order
 * - POST /api/subscriptions/verify
 * - POST /api/subscriptions/webhook
 * - GET  /api/subscriptions/current
 * - GET  /api/subscriptions/history
 * - GET  /api/subscriptions/invoices/:id
 * - GET  /api/payments/history
 *
 * Security:
 * - All routes except webhook are protected by Firebase auth.
 * - Never trust payment data from frontend; verify using Razorpay signature.
 */

const express = require('express');
const router = express.Router();

const asyncHandler = require('../middleware/asyncHandler');
const { verifyFirebaseIdToken } = require('../middleware/authFirebase');
const { badRequest, forbidden, notFound } = require('../utils/httpErrors');

const subscriptionService = require('../services/subscriptionService');
const paymentService = require('../services/paymentService');
const invoiceService = require('../services/invoiceService');
const razorpayPaymentService = require('../services/paymentService');
const { createPaymentQr } = require('../services/qrService');
const PaymentTransaction = require('../Model/PaymentTransaction');
const plans = require('../config/subscriptionPlans');

// -------------------------
// Current subscription
// -------------------------
router.get('/current', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const data = await subscriptionService.getActivePlanAndQuota(userId);
  res.json({ success: true, data });
}));

// -------------------------
// Subscription history
// -------------------------
router.get('/history', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;

  // PaymentTransaction currently exists; until Payment model migration is completed,
  // we return payment history as subscription history.
  const history = await paymentService.getSubscriptionHistory(userId);
  res.json({ success: true, data: history });
}));

// -------------------------
// Create Razorpay order
// -------------------------
router.post('/order', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const { planKey } = req.body || {};
  if (!planKey) throw badRequest('planKey is required.');

  const userId = req.user.uid;
  const userEmail = req.user.email;
  const userName = req.user.name;

  const data = await paymentService.createRazorpayOrder({
    userId,
    planKey,
    userEmail,
    userName,
  });

  res.json({ success: true, data });
}));

// -------------------------
// Verify payment (idempotent)
// -------------------------
router.post('/verify', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const { planKey, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};

  if (!planKey || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw badRequest('planKey, razorpayOrderId, razorpayPaymentId and razorpaySignature are required.');
  }

  const userId = req.user.uid;
  const userEmail = req.user.email;
  const userName = req.user.name;

  const result = await paymentService.verifyAndActivate({
    userId,
    planKey,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    userEmail,
    userName,
  });

  res.json({ success: true, data: result });
}));

// -------------------------
// Razorpay webhook (signature verification + replay safety)
// -------------------------
// NOTE: webhook signature verification needs raw body; this project currently uses body-parser
// which may not provide raw body. We will wire correct raw-body handling in Phase B follow-up.
router.post('/webhook', asyncHandler(async (req, res) => {
  // Webhooks should be processed without Firebase auth.
  const event = await paymentService.handleRazorpayWebhook(req);
  res.json({ success: true, data: { received: true, event } });
}));

// -------------------------
// Generate QR payment (Task 8)
// -------------------------
router.post('/qr', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const { planKey } = req.body || {};
  if (!planKey) throw badRequest('planKey is required.');

  const key = String(planKey).toLowerCase();
  const plan = plans[key];
  if (!plan) throw badRequest('Invalid subscription plan.');
  if (plan.priceINR <= 0) throw badRequest('QR payment is only available for paid plans.');

  const qr = await createPaymentQr({
    amountPaise: Math.round(plan.priceINR * 100),
    currency: 'INR',
    description: `${plan.name} Subscription`,
    reference: `sub_${req.user.uid}_${Date.now()}`,
    userId: req.user.uid,
    planKey: plan.planKey,
  });

  res.json({ success: true, data: { ...qr, planKey: plan.planKey, planName: plan.name, amount: plan.priceINR } });
}));

// -------------------------
// Payment history (Task 7)
// -------------------------
router.get('/payments', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    PaymentTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PaymentTransaction.countDocuments({ userId }),
  ]);

  res.json({
    success: true,
    data: payments,
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
}));

// -------------------------
// Get payment status by order id (for QR polling / success / cancel)
// -------------------------
router.get('/payments/:orderId', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const txn = await PaymentTransaction.findOne({ userId, razorpayOrderId: req.params.orderId }).lean();
  if (!txn) throw notFound('Payment not found.');
  res.json({ success: true, data: txn });
}));

// -------------------------
// Invoice download by invoice id
// -------------------------
router.get('/invoices/:id', verifyFirebaseIdToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { id } = req.params;

  const invoice = await invoiceService.getInvoiceForUser(userId, id);
  if (!invoice) throw notFound('Invoice not found.');

  res.json({ success: true, data: invoice });
}));

module.exports = router;

