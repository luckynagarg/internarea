/**
 * Resume creation (Premium only):
 * - Student enters resume details
 * - System sends OTP to registered email
 * - After OTP verification, Razorpay payment is processed
 * - After payment verification, a professional resume PDF is generated and attached to the profile
 *
 * Also provides resume dashboard CRUD (list, get, delete, duplicate, update, visibility).
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const asyncHandler = require('../middleware/asyncHandler');
const { verifyFirebaseIdToken } = require('../middleware/authFirebase');

const subscriptionService = require('../services/subscriptionService');
const {
  createResumePurchase,
  verifyResumeOtp,
  markResumePaymentAndGenerate,
} = require('../services/resumeService');

const { getRazorpayInstance } = require('../services/razorpayService');
const PaymentTransaction = require('../Model/PaymentTransaction');
const Resume = require('../Model/Resume');

const { badRequest, forbidden, notFound } = require('../utils/httpErrors');
const crypto = require('crypto');

const RESUME_PRICE_INR = 50;
const RESUME_CURRENCY = process.env.RAZORPAY_CURRENCY || 'INR';

function normalizePlanKey(planKey) {
  return String(planKey || '').toLowerCase();
}

function isPremiumSubscription(planKey, status) {
  // premium = not free (any of bronze/silver/gold) and active
  if (status !== 'active') return false;
  return normalizePlanKey(planKey) !== 'free';
}

router.post(
  '/purchase/start',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const { resumeData, photoUrl } = req.body;

    const userId = req.user.uid;
    const email = req.user.email;

    if (!email) {
      throw badRequest('Email not found in authenticated user profile.');
    }

    const sub = await subscriptionService.getActivePlanAndQuota(userId);

    if (!isPremiumSubscription(sub.planKey, sub.subscriptionStatus)) {
      throw forbidden(
        'Resume creation is available only under the premium plan.'
      );
    }

    const { resumeId, otpExpiresAt } = await createResumePurchase({
      userId,
      email,
      resumeData,
      photoUrl,
    });

    return res.json({
      success: true,
      data: { resumeId, otpExpiresAt },
    });
  })
);

router.post(
  '/purchase/otp/verify',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const { resumeId, otp } = req.body;

    if (!resumeId || !otp) {
      throw badRequest('resumeId and otp are required.');
    }

    const userId = req.user.uid;
    const email = req.user.email;

    const result = await verifyResumeOtp({
      userId,
      email,
      otp,
      resumeId,
    });

    return res.json({
      success: true,
      data: result,
    });
  })
);

router.post(
  '/purchase/razorpay/create-order',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const { resumeId } = req.body;

    if (!resumeId) {
      throw badRequest('resumeId is required.');
    }

    // Defense in depth: refuse to open a Razorpay checkout outside the
    // 10:00–11:00 AM IST payment window (mirrors /payment/create-order).
    const { isPaymentTimeAllowedNow } = require('../config/paymentWindow');
    if (!isPaymentTimeAllowedNow()) {
      const err = new Error('Resume payment is only accepted between 10:00 AM and 11:00 AM IST.');
      err.statusCode = 403;
      throw err;
    }

    const resume = await Resume.findOne({
      _id: resumeId,
      userId: req.user.uid,
    });

    if (!resume) {
      throw notFound('Resume not found.');
    }

    if (resume.status !== 'otp_verified') {
      throw forbidden('OTP verification required before payment.');
    }

    const amountPaise = RESUME_PRICE_INR * 100;

    const razorpay = getRazorpayInstance();

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: RESUME_CURRENCY,
      receipt: `resume_${req.user.uid}_${resumeId}_${Date.now()}`,
      payment_capture: 1,
    });

    const txn = await PaymentTransaction.create({
      userId: req.user.uid,
      planKey: 'resume',
      amount: RESUME_PRICE_INR,
      currency: RESUME_CURRENCY,
      razorpayOrderId: order.id,
      razorpayPaymentId: null,
      razorpaySignature: null,
      status: 'created',
      invoiceNumber: null,
    });

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: RESUME_PRICE_INR,
        currency: RESUME_CURRENCY,
        transactionId: txn._id,
        resumeId,
      },
    });
  })
);

router.post(
  '/purchase/razorpay/verify',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const {
      resumeId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      planKey,
    } = req.body;

    if (
      !resumeId ||
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      throw badRequest(
        'resumeId, razorpayOrderId, razorpayPaymentId, razorpaySignature are required.'
      );
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      throw new Error('Razorpay secret not configured.');
    }

    // Defense in depth: payment verification is also rejected outside the
    // 10:00–11:00 AM IST payment window (mirrors /payment/verify).
    const { isPaymentTimeAllowedNow } = require('../config/paymentWindow');
    if (!isPaymentTimeAllowedNow()) {
      const err = new Error('Resume payment is only accepted between 10:00 AM and 11:00 AM IST.');
      err.statusCode = 403;
      throw err;
    }

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw badRequest('Payment verification failed. Please try again.');
    }

    const txn = await PaymentTransaction.findOne({
      userId: req.user.uid,
      razorpayOrderId,
    });

    if (!txn) {
      throw badRequest('Payment order not found.');
    }

    txn.status = 'verified';
    txn.razorpayPaymentId = razorpayPaymentId;
    txn.razorpaySignature = razorpaySignature;
    txn.verifiedAt = new Date();

    await txn.save();

    const result = await markResumePaymentAndGenerate({
      resumeId,
      userId: req.user.uid,
      razorpayPayload: {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      },
      paymentMeta: {
        transactionId: txn._id,
      },
    });

    return res.json({
      success: true,
      data: result,
    });
  })
);

// GET /api/resume/my-resumes — list the logged-in user's resumes.
router.get(
  '/my-resumes',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const userId = req.user?.uid;

    if (!userId) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const resumes = await Resume.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      data: resumes,
    });
  })
);

// ---------------------------------------------------------------------------
// Payment-first resume creation flow
// ---------------------------------------------------------------------------

const {
  createResumePaymentOrder,
  verifyResumePaymentAndCreateEntitlement,
  getResumeCreateAccess,
  saveResumeData,
  generateResumeFromEntitlement,
  issueResumePurchaseOtp,
  verifyResumePurchaseOtp,
  hasVerifiedResumePurchaseOtp,
} = require('../services/resumeService');

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many OTP requests. Please try again later.',
  },
});

/**
 * POST /api/resume/otp/send
 *
 * Step 1 of the premium resume flow. Requires authentication, generates a
 * cryptographically secure 6-digit OTP bound to the AUTHENTICATED user's email
 * and purpose = premium_resume_purchase, and emails it.
 *
 * The OTP value is never returned in the response and never logged.
 */
router.post(
  '/otp/send',
  verifyFirebaseIdToken,
  otpLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.user.uid;
    const email = req.user.email;

    if (!email) {
      throw badRequest('Email not found in authenticated user profile.');
    }

    const data = await issueResumePurchaseOtp({
      userId,
      email,
      toName: req.user.name,
    });

    return res.json({ success: true, data });
  })
);

/**
 * POST /api/resume/otp/verify
 *
 * Step 2. Verifies the email OTP and mints a short-lived server-side
 * verification state that the payment create-order endpoint requires.
 */
router.post(
  '/otp/verify',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.uid;
    const email = req.user.email;
    const { otp } = req.body || {};

    if (!email) {
      throw badRequest('Email not found in authenticated user profile.');
    }
    if (!otp) {
      throw badRequest('otp is required.');
    }

    const data = await verifyResumePurchaseOtp({
      userId,
      email,
      otp: String(otp).trim(),
    });

    return res.json({ success: true, data });
  })
);

// POST /api/resume/payment/create-order
//
// CRITICAL: this endpoint refuses to create a Razorpay order unless the SERVER
// has recorded a valid, unexpired, successfully verified resume-purchase OTP for
// the authenticated user. A client sending `otpVerified: true` (or any other
// field) has no effect.
router.post(
  '/payment/create-order',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.uid;
    const userEmail = req.user.email;

    const otpVerified = await hasVerifiedResumePurchaseOtp({ userId });

    if (!otpVerified) {
      return res.status(403).json({
        success: false,
        code: 'RESUME_OTP_REQUIRED',
        message: 'Email OTP verification is required before creating a payment order.',
      });
    }

    const data = await createResumePaymentOrder({
      userId,
      userEmail,
    });

    return res.json({
      success: true,
      data,
    });
  })
);

// POST /api/resume/payment/verify
router.post(
  '/payment/verify',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body || {};

    if (
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      throw badRequest(
        'razorpayOrderId, razorpayPaymentId and razorpaySignature are required.'
      );
    }

    const userId = req.user.uid;
    const userEmail = req.user.email;

    const result = await verifyResumePaymentAndCreateEntitlement({
      userId,
      userEmail,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    return res.json({
      success: true,
      data: result,
    });
  })
);

// IMPORTANT:
// Keep /create-access BEFORE /:id.
// Otherwise Express can treat "create-access" as the :id value.
router.get(
  '/create-access',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const userId = req.user?.uid;

    const access = await getResumeCreateAccess(userId);

    return res.json({
      success: true,
      data: access,
    });
  })
);

// GET /api/resume/:id — fetch a single resume
router.get(
  '/:id',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const userId = req.user?.uid;
    const { id } = req.params;

    const resume = await Resume.findOne({
      _id: id,
    }).lean();

    if (!resume) {
      throw notFound('Resume not found.');
    }

    // Owner can always view; non-owner only if marked public.
    if (
      resume.userId !== userId &&
      resume.visibility !== 'public'
    ) {
      throw forbidden(
        'You do not have permission to view this resume.'
      );
    }

    res.json({
      success: true,
      data: resume,
    });
  })
);

// DELETE /api/resume/:id — delete own resume.
router.delete(
  '/:id',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const userId = req.user?.uid;
    const { id } = req.params;

    const resume = await Resume.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!resume) {
      throw notFound('Resume not found.');
    }

    res.json({
      success: true,
      deleted: true,
    });
  })
);

// POST /api/resume/:id/duplicate — duplicate own resume.
router.post(
  '/:id/duplicate',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const userId = req.user?.uid;
    const { id } = req.params;

    const source = await Resume.findOne({
      _id: id,
      userId,
    }).lean();

    if (!source) {
      throw notFound('Resume not found.');
    }

    const copy = await Resume.create({
      userId,
      resumeData: source.resumeData,
      photoUrl: source.photoUrl || null,
      resumePdfPath: source.resumePdfPath || null,
      status: source.status,
      payment: source.payment || {},
      otpVerifiedAt: source.otpVerifiedAt || null,
      visibility: 'private',
    });

    res.json({
      success: true,
      data: copy,
    });
  })
);

// PATCH /api/resume/:id — update own resume data / visibility.
router.patch(
  '/:id',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const userId = req.user?.uid;
    const { id } = req.params;

    const {
      resumeData,
      photoUrl,
      visibility,
    } = req.body || {};

    const resume = await Resume.findOne({
      _id: id,
      userId,
    });

    if (!resume) {
      throw notFound('Resume not found.');
    }

    if (
      resumeData &&
      typeof resumeData === 'object'
    ) {
      resume.resumeData = resumeData;
    }

    if (photoUrl !== undefined) {
      resume.photoUrl = photoUrl;
    }

    if (visibility !== undefined) {
      resume.visibility = visibility;
    }

    await resume.save();

    res.json({
      success: true,
      data: resume,
    });
  })
);

// PATCH /api/resume/:id/visibility — toggle public/private.
router.patch(
  '/:id/visibility',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const userId = req.user?.uid;
    const { id } = req.params;
    const { visibility } = req.body || {};

    if (!['public', 'private'].includes(visibility)) {
      throw badRequest(
        'visibility must be public or private.'
      );
    }

    const resume = await Resume.findOneAndUpdate(
      {
        _id: id,
        userId,
      },
      {
        $set: {
          visibility,
        },
      },
      {
        new: true,
      }
    ).lean();

    if (!resume) {
      throw notFound('Resume not found.');
    }

    res.json({
      success: true,
      data: resume,
    });
  })
);

// PATCH /api/resume/:id/resume-data — save form data
router.patch(
  '/:id/resume-data',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const userId = req.user?.uid;
    const { id } = req.params;
    const { resumeData, photoUrl } = req.body || {};

    if (
      !resumeData ||
      typeof resumeData !== 'object'
    ) {
      throw badRequest('resumeData is required.');
    }

    const resume = await saveResumeData({
      userId,
      resumeId: id,
      resumeData,
      photoUrl,
    });

    return res.json({
      success: true,
      data: resume,
    });
  })
);

// POST /api/resume/:id/generate — generate PDF
router.post(
  '/:id/generate',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const userId = req.user?.uid;
    const { id } = req.params;

    const result = await generateResumeFromEntitlement({
      userId,
      resumeId: id,
    });

    return res.json({
      success: true,
      data: result,
    });
  })
);

// GET /api/resume/resumes/:resumeId/download
router.get(
  '/resumes/:resumeId/download',
  verifyFirebaseIdToken,
  asyncHandler(async (req, res) => {
    const fs = require('fs');

    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      userId: req.user.uid,
    });

    if (!resume) {
      throw notFound('Resume not found.');
    }

    if (!resume.resumePdfPath) {
      throw notFound('Resume PDF not generated yet.');
    }

    if (!fs.existsSync(resume.resumePdfPath)) {
      throw notFound('Resume file not found on server.');
    }

    res.setHeader(
      'Content-Type',
      'application/octet-stream'
    );

    const fileName = `resume_${resume._id}`;

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}.pdf"`
    );

    return fs
      .createReadStream(resume.resumePdfPath)
      .pipe(res);
  })
);

module.exports = router;