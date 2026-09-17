const path = require('path');
const fs = require('fs');

const Resume = require('../Model/Resume');
const ResumeOtpVerification = require('../Model/ResumeOtpVerification');
const { sendOtpEmail } = require('./otpEmailService');
const { sendLoginOtpEmail } = require('./loginEmailOtpService');

const crypto = require('crypto');
const { badRequest, forbidden, internalServerError, notFound } = require('../utils/httpErrors');

const { generateResumePdf } = require('./resumeGeneratorService');

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_OTP_VERIFY_ATTEMPTS = 5;

function generateOtp() {
  const num = crypto.randomInt(0, 1000000);
  return String(num).padStart(OTP_LENGTH, '0');
}

async function hashOtp(otp) {
  const secret = process.env.OTP_HMAC_SECRET;
  if (!secret) throw internalServerError('OTP_HMAC_SECRET is not set.');

  return crypto.createHmac('sha256', secret).update(String(otp)).digest('hex');
}

async function verifyOtpAgainstHash(otp, otpHash) {
  const computed = await hashOtp(otp);
  return crypto.timingSafeEqual(
    Buffer.from(computed, 'hex'),
    Buffer.from(String(otpHash), 'hex')
  );
}

function ensureEmailPresent(email) {
  if (!email) {
    const err = new Error('Email not available for the authenticated user.');
    err.statusCode = 400;
    throw err;
  }
}

function validateResumeInput(resumeData) {
  if (!resumeData || typeof resumeData !== 'object') {
    throw badRequest('resumeData is required.');
  }
  const { fullName, qualifications, experience, personalInfo } = resumeData;

  if (!fullName) throw badRequest('fullName is required.');
  if (!qualifications) throw badRequest('qualifications is required.');
  if (!experience) throw badRequest('experience is required.');
  if (!personalInfo) throw badRequest('personalInfo is required.');
}

async function createResumePurchase({ userId, email, resumeData, photoUrl }) {
  ensureEmailPresent(email);
  validateResumeInput(resumeData);

  // Create resume record first; payment happens later after OTP verification.
  const resume = await Resume.create({
    userId,
    resumeData,
    photoUrl: photoUrl || null,
    status: 'otp_pending',
    otpVerifiedAt: null,
  });

  // Issue OTP challenge
  const existing = await ResumeOtpVerification.findOne({ userId, email }).sort({ createdAt: -1 });
  const now = new Date();

  if (existing?.lastOtpSentAt) {
    const delta = now.getTime() - existing.lastOtpSentAt.getTime();
    if (delta < OTP_RESEND_COOLDOWN_MS) {
      throw forbidden('OTP resend is too frequent. Please try again shortly.');
    }
  }

  // Invalidate previous OTP
  if (existing && !existing.otpConsumed) {
    existing.otpConsumed = true;
    await existing.save();
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

  const doc = existing || new ResumeOtpVerification({ userId, email });
  doc.otpHash = otpHash;
  doc.otpExpiresAt = otpExpiresAt;
  doc.otpAttempts = 0;
  doc.maxOtpVerifyAttempts = MAX_OTP_VERIFY_ATTEMPTS;
  doc.otpConsumed = false;
  doc.lastOtpSentAt = now;
  await doc.save();

  // Send email OTP
  await sendOtpEmail({ toEmail: email, otp, toName: resumeData?.fullName || '' });

  return { resumeId: resume._id, otpExpiresAt };
}

async function verifyResumeOtp({ userId, email, otp, resumeId }) {
  ensureEmailPresent(email);

  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) throw notFound('Resume not found.');

  const record = await ResumeOtpVerification.findOne({ userId, email }).sort({ createdAt: -1 });
  if (!record || !record.otpHash) throw badRequest('Invalid or expired OTP.');
  if (record.otpConsumed) throw badRequest('Invalid or expired OTP.');
  if (!record.otpExpiresAt || record.otpExpiresAt.getTime() < Date.now()) {
    throw badRequest('Invalid or expired OTP.');
  }
  if (record.otpAttempts >= record.maxOtpVerifyAttempts) {
    throw forbidden('Too many incorrect OTP attempts. Please request a new OTP.');
  }

  const isCorrect = await verifyOtpAgainstHash(otp, record.otpHash);
  record.otpAttempts = (record.otpAttempts || 0) + 1;

  if (!isCorrect) {
    await record.save();
    throw badRequest('Invalid or expired OTP.');
  }

  record.otpConsumed = true;
  await record.save();

  resume.otpVerifiedAt = new Date();
  resume.status = 'otp_verified';
  await resume.save();

  return { verified: true };
}

// ---------------------------------------------------------------------------
// OTP-before-Razorpay verification state (form comes AFTER payment).
//
// Flow: send OTP -> verify OTP (creates a short-lived server-side verification
// state) -> create Razorpay order (requires that state) -> pay -> verify
// signature -> resume form -> generate.
//
// The verification state lives in MongoDB, keyed by the AUTHENTICATED userId and
// a fixed server-side purpose. It can never be produced by the client.
// ---------------------------------------------------------------------------

const RESUME_OTP_PURPOSE = 'premium_resume_purchase';
const RESUME_OTP_VERIFICATION_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Issues (or re-issues) the email OTP that authorises a premium resume purchase.
 * Returns metadata only — the OTP value is never returned to the caller.
 */
async function issueResumePurchaseOtp({ userId, email, toName }) {
  ensureEmailPresent(email);

  const purpose = RESUME_OTP_PURPOSE;
  const existing = await ResumeOtpVerification.findOne({ userId, email, purpose }).sort({
    createdAt: -1,
  });
  const now = new Date();

  if (existing?.lastOtpSentAt) {
    const delta = now.getTime() - existing.lastOtpSentAt.getTime();
    if (delta < OTP_RESEND_COOLDOWN_MS) {
      throw forbidden('OTP resend is too frequent. Please try again shortly.');
    }
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

  const doc = existing || new ResumeOtpVerification({ userId, email, purpose });
  doc.purpose = purpose;
  doc.otpHash = otpHash;
  doc.otpExpiresAt = otpExpiresAt;
  doc.otpAttempts = 0;
  doc.maxOtpVerifyAttempts = MAX_OTP_VERIFY_ATTEMPTS;
  doc.otpConsumed = false;
  doc.lastOtpSentAt = now;
  // Any previous verification state is invalidated when a new OTP is issued.
  doc.verifiedAt = null;
  doc.verificationExpiresAt = null;
  await doc.save();

  await sendOtpEmail({ toEmail: email, otp, toName: toName || '' });

  return {
    otpExpiresAt,
    resendCooldownSeconds: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000),
    purpose,
  };
}

/**
 * Verifies the OTP and, on success, creates the short-lived verification state.
 * The OTP itself is single-use (otpConsumed) and is never returned or logged.
 */
async function verifyResumePurchaseOtp({ userId, email, otp }) {
  ensureEmailPresent(email);

  if (!otp) throw badRequest('otp is required.');

  const record = await ResumeOtpVerification.findOne({
    userId,
    email,
    purpose: RESUME_OTP_PURPOSE,
  }).sort({ createdAt: -1 });

  if (!record || !record.otpHash) throw badRequest('Invalid or expired OTP.');
  if (record.otpConsumed) throw badRequest('Invalid or expired OTP.');
  if (!record.otpExpiresAt || record.otpExpiresAt.getTime() < Date.now()) {
    throw badRequest('Invalid or expired OTP.');
  }
  if (record.otpAttempts >= record.maxOtpVerifyAttempts) {
    throw forbidden('Too many incorrect OTP attempts. Please request a new OTP.');
  }

  const isCorrect = await verifyOtpAgainstHash(otp, record.otpHash);
  record.otpAttempts = (record.otpAttempts || 0) + 1;

  if (!isCorrect) {
    await record.save();
    throw badRequest('Invalid or expired OTP.');
  }

  const verificationExpiresAt = new Date(Date.now() + RESUME_OTP_VERIFICATION_TTL_MS);

  // Single-use OTP + freshly minted verification state.
  record.otpConsumed = true;
  record.verifiedAt = new Date();
  record.verificationExpiresAt = verificationExpiresAt;
  await record.save();

  return { verified: true, verificationExpiresAt };
}

/**
 * True when the authenticated user holds a valid, unexpired, successfully
 * verified resume-purchase OTP state.
 *
 * @param {{ userId: string }} params
 */
async function hasVerifiedResumePurchaseOtp({ userId }) {
  if (!userId) return false;

  const record = await ResumeOtpVerification.findOne({
    userId,
    purpose: RESUME_OTP_PURPOSE,
    verifiedAt: { $ne: null },
    verificationExpiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();

  return !!record;
}

async function markResumePaymentAndGenerate({ resumeId, userId, razorpayPayload, paymentMeta }) {
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) throw notFound('Resume not found.');

  if (resume.status === 'generated') {
    return { alreadyGenerated: true, resumePdfPath: resume.resumePdfPath };
  }

  if (!resume.otpVerifiedAt) {
    throw forbidden('OTP not verified yet.');
  }

  resume.status = 'paid_not_generated';
  resume.payment = {
    ...(resume.payment || {}),
    transactionId: paymentMeta?.transactionId || null,
    razorpayOrderId: razorpayPayload.razorpayOrderId || null,
    razorpayPaymentId: razorpayPayload.razorpayPaymentId || null,
    razorpaySignature: razorpayPayload.razorpaySignature || null,
    paidAt: new Date(),
  };
  await resume.save();

  // Generate resume artifact after successful payment verification.
  const safeUserFolder = String(userId).slice(0, 10);
  const baseDir = path.join(process.cwd(), 'uploads', 'resumes', safeUserFolder);
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

  const outBasePath = path.join(baseDir, `resume_${resumeId}`);
  const pdfPath = await generateResumePdf({
    resumeData: resume.resumeData,
    photoUrl: resume.photoUrl,
    userName: resume.resumeData?.fullName,
    outputPath: outBasePath,
  });

  resume.resumePdfPath = pdfPath;
  resume.status = 'generated';
  await resume.save();

  return { resumePdfPath: resume.resumePdfPath, resumeId: resume._id };
}

/**
 * Payment-first resume creation helpers.
 *
 * The user pays for a "Resume Creation entitlement" BEFORE seeing the resume
 * form. After a successful (server-verified) payment we create a Resume doc in
 * the `paid_not_generated` state with empty resumeData. The user then fills the
 * form, which is saved, and finally the PDF is generated (`generated`).
 */

// Fee for one premium resume creation (in INR).
const RESUME_PRICE_INR = Number(process.env.RESUME_PRICE_INR || 50);

function resumePriceInr() {
  return Number.isFinite(RESUME_PRICE_INR) && RESUME_PRICE_INR > 0 ? RESUME_PRICE_INR : 50;
}

/**
 * Find the user's reusable paid-but-unsaved resume entitlement.
 * A paid entitlement is a Resume doc owned by `userId` that has been paid for
 * (status 'paid_not_generated' or 'otp_verified') but has NOT been generated yet
 * and has not completed its form. We treat `paid_not_generated` as the
 * "entitlement created, form not yet completed" marker.
 */
async function findPaidResumeEntitlement(userId) {
  return Resume.findOne({
    userId,
    status: 'paid_not_generated',
    'payment.paidAt': { $ne: null },
  })
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Create a Razorpay order for a single resume creation.
 * Reuses the shared Razorpay instance via razorpayService.
 */
async function createResumePaymentOrder({ userId, userEmail }) {
  const PaymentTransaction = require('../Model/PaymentTransaction');
  const { getRazorpayInstance } = require('./razorpayService');

  const priceInr = resumePriceInr();
  const currency = process.env.RAZORPAY_CURRENCY || 'INR';

  // Prevent duplicate active orders for the same user (avoid accidental double charge).
  const duplicate = await PaymentTransaction.findOne({
    userId,
    status: 'created',
    planKey: 'resume',
  });
  if (duplicate) {
    return {
      orderId: duplicate.razorpayOrderId,
      amount: duplicate.amount,
      currency: duplicate.currency,
      transactionId: duplicate._id,
    };
  }

  const razorpay = getRazorpayInstance();
  const order = await razorpay.orders.create({
    amount: priceInr * 100,
    currency,
    receipt: `resume_${userId}_${Date.now()}`,
    payment_capture: 1,
  });

  const txn = await PaymentTransaction.create({
    userId,
    planKey: 'resume',
    amount: priceInr,
    currency,
    razorpayOrderId: order.id,
    razorpayPaymentId: null,
    razorpaySignature: null,
    status: 'created',
    invoiceNumber: null,
  });

  return {
    orderId: order.id,
    amount: priceInr,
    currency,
    transactionId: txn._id,
    keyId: process.env.RAZORPAY_KEY_ID || '',
  };
}

/**
 * Verify the Razorpay payment signature server-side and create (or reuse) a
 * paid Resume entitlement. Idempotent: a user with an existing entitlement is
 * not charged again.
 */
async function verifyResumePaymentAndCreateEntitlement({ userId, userEmail, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const PaymentTransaction = require('../Model/PaymentTransaction');

  // 1. Look up the transaction (must exist and belong to the user).
  const txn = await PaymentTransaction.findOne({ userId, razorpayOrderId });
  if (!txn) throw notFound('Payment order not found.');

  // 2. Idempotency: already verified -> reuse existing entitlement.
  if (txn.status === 'verified') {
    const existing = await findPaidResumeEntitlement(userId);
    if (existing) {
      return { resumeId: existing._id, alreadyPaid: true, transactionId: txn._id };
    }
  }

  // 2b. Enforce the payment time window server-side (10:00–11:00 AM IST by default).
  const { isPaymentTimeAllowedNow } = require('../config/paymentWindow');
  if (!isPaymentTimeAllowedNow()) {
    const err = new Error('Resume payment is only accepted between 10:00 AM and 11:00 AM IST.');
    err.statusCode = 403;
    throw err;
  }

  // 3. Verify signature using the server secret.
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw internalServerError('RAZORPAY_KEY_SECRET is not set.');

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (expected !== razorpaySignature) {
    txn.status = 'failed';
    txn.failureReason = 'Signature verification failed.';
    txn.razorpayPaymentId = razorpayPaymentId;
    txn.razorpaySignature = razorpaySignature;
    await txn.save();
    throw forbidden('Payment verification failed. Please try again.');
  }

  // 4. Mark the transaction verified.
  txn.status = 'verified';
  txn.razorpayPaymentId = razorpayPaymentId;
  txn.razorpaySignature = razorpaySignature;
  txn.verifiedAt = new Date();
  await txn.save();

  // 5. Create the paid Resume entitlement (empty resumeData for now).
  const resume = await Resume.create({
    userId,
    resumeData: {
      fullName: '',
      qualifications: '',
      experience: '',
      personalInfo: {
        email: userEmail || '',
        phone: '',
        location: '',
        linkedin: '',
        website: '',
      },
    },
    photoUrl: null,
    status: 'paid_not_generated',
    payment: {
      transactionId: txn._id,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paidAt: new Date(),
    },
  });

  return { resumeId: resume._id, alreadyPaid: false, transactionId: txn._id };
}

/**
 * Get resume creation access for a user.
 * Returns { allowed, resumeId } where resumeId is the reusable paid entitlement if present.
 */
async function getResumeCreateAccess(userId) {
  if (!userId) return { allowed: false, resumeId: null };

  const entitlement = await findPaidResumeEntitlement(userId);
  return {
    allowed: !!entitlement,
    resumeId: entitlement ? entitlement._id : null,
  };
}

/**
 * Save the resume form data into the user's paid entitlement.
 * Owner-only (route enforces ownership).
 */
async function saveResumeData({ userId, resumeId, resumeData, photoUrl }) {
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) throw notFound('Resume not found.');

  resume.resumeData = resumeData || resume.resumeData;
  if (photoUrl !== undefined) resume.photoUrl = photoUrl;
  await resume.save();

  return resume;
}

/**
 * Generate the resume PDF from saved form data and mark it generated.
 * Returns the stored artifact (the resume doc, lean).
 */
async function generateResumeFromEntitlement({ userId, resumeId }) {
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) throw notFound('Resume not found.');

  if (resume.status === 'generated') {
    return { alreadyGenerated: true, resume: resume.toObject() };
  }

  // Ensure a valid paid entitlement.
  if (resume.status !== 'paid_not_generated' || !resume.payment?.paidAt) {
    throw forbidden('No valid paid resume entitlement for this resume.');
  }

  const { resumeData, photoUrl } = resume;
  const fullName = resumeData?.fullName;
  if (!fullName) throw badRequest('Please fill in your resume details before generating.');

  const safeUserFolder = String(userId).slice(0, 10);
  const baseDir = path.join(process.cwd(), 'uploads', 'resumes', safeUserFolder);
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

  const outBasePath = path.join(baseDir, `resume_${resumeId}`);
  const pdfPath = await generateResumePdf({
    resumeData,
    photoUrl: resume.photoUrl,
    userName: resumeData?.fullName,
    outputPath: outBasePath,
  });

  resume.resumePdfPath = pdfPath;
  resume.status = 'generated';
  await resume.save();

  return { alreadyGenerated: false, resume: resume.toObject() };
}

module.exports = {
  createResumePurchase,
  verifyResumeOtp,
  markResumePaymentAndGenerate,
  createResumePaymentOrder,
  verifyResumePaymentAndCreateEntitlement,
  getResumeCreateAccess,
  saveResumeData,
  generateResumeFromEntitlement,
  // OTP-before-Razorpay verification state
  issueResumePurchaseOtp,
  verifyResumePurchaseOtp,
  hasVerifiedResumePurchaseOtp,
  RESUME_OTP_PURPOSE,
  RESUME_OTP_VERIFICATION_TTL_MS,
};

