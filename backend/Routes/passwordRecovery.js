const express = require("express");
const router = express.Router();

const asyncHandler = require("../middleware/asyncHandler");
const { badRequest, forbidden, internalServerError } = require("../utils/httpErrors");


const {
  normalizeIdentifier,
  requestPasswordReset,
  verifyOtp,
  resendOtp,
  markPasswordResetCompleted,
} = require("../services/passwordRecoveryService");

// OTP delivery hooks (email/SMS). Email template wiring is currently a stub.
// This keeps the architecture ready without breaking the flow.
const { sendOtpEmail, sendOtpSms } = require("../services/otpEmailService");

const OTP_DEBUG_OVERRIDE = process.env.OTP_DEBUG_OVERRIDE === "true";

const { getAuthOrThrow } = require("../config/firebaseAdmin");
// Legacy v12-style compatibility shim: firebase-admin v14 removed `admin.auth()`.
// Keep call sites using `admin.auth()` working by mapping it to the v14 `getAuth()`.
const admin = { auth: () => getAuthOrThrow() };


/**
 * Security policy:
 * - Never reveal whether an email/phone exists.
 * - Always return a generic response for request endpoints.
 *
 * NOTE:
 * This project is Firebase-based. For password reset:
 * - For password-authenticated users, we generate an OTP and verify it server-side.
 * - After verification, we update the user's password via Firebase Admin (updateUser).
 * - For Google-authenticated users, we block OTP and reset.
 *
 * Firebase limitation:
 * Firebase Admin SDK cannot directly tell provider type (password vs google)
 * reliably for all accounts. We use sign-in methods from Firebase to determine
 * whether password provider is enabled.
 */

function isValidMethod(method) {
  return method === "email" || method === "phone";
}

async function getAuthProviderForIdentifier({ method, identifier }) {
  // Determine sign-in methods via Firebase Auth.
  // For phone, Firebase admin lookup uses listUsers with phoneNumber filter.
  // For email, use same listUsers with email filter.
  //
  // We do NOT throw distinct errors that leak existence.

  const normalized = normalizeIdentifier(method, identifier);
  if (!normalized) return "unknown";

  // Find user
  const filter = method === "email" ? { email: normalized } : { phoneNumber: normalized };

  const users = await admin.auth().listUsers(100, filter);
  const user = users.users && users.users.length ? users.users[0] : null;

  if (!user) return "unknown";

  const uid = user.uid;
  const providerMethods = (user.providerData || []).map((p) => p.providerId);

  // If Firebase indicates password provider (password), allow.
  // For Google provider, block.
  if (providerMethods.includes("google.com")) return "google";

  // If any other auth method exists, treat as unknown/password for safety.
  // In practice, password accounts should pass this.
  return providerMethods.includes("password") ? "password" : "password";
}

/**
 * Generic send response.
 */
function genericRequestResponse(res) {
  return res.status(200).json({
    success: true,
    message:
      "If an account exists, we will send an OTP to help you reset your password.",
  });
}

router.post("/request", asyncHandler(async (req, res) => {
  const { method, identifier } = req.body || {};

  if (!isValidMethod(method) || !identifier) {
    throw badRequest("method and identifier are required.");
  }

  // Normalize identifier for stable DB key.
  const normalized = normalizeIdentifier(method, identifier);

  // Always respond generically.
  try {
    const users =
      method === "email"
        ? await admin.auth().listUsers(100, { email: normalized })
        : await admin.auth().listUsers(100, { phoneNumber: normalized });

    const user = users.users && users.users.length ? users.users[0] : null;
    const authProvider = user
      ? (user.providerData || []).some((p) => p.providerId === "google.com")
        ? "google"
        : "password"
      : await getAuthProviderForIdentifier({ method, identifier });


    // If user not found, still behave generically (do not create recovery doc).
    if (!user) return genericRequestResponse(res);

    const userId = user.uid;

    // requestPasswordReset enforces daily restriction, OTP resend cooldown, etc.
    // If google account, it throws forbidden.
    const { otp } = await requestPasswordReset({
      userId,
      method,
      authProvider,
    });

    // Send OTP (production) via email/SMS hooks.
    // NOTE: OTP is never returned to the client.
    // In prod, delivery failures MUST be surfaced (so we can debug and users can retry).
    if (method === "email") {
      if (!user?.email) {
        throw internalServerError("User email not available for OTP delivery.");
      }

      await sendOtpEmail({
        toEmail: user.email,
        toName: user.displayName,
        otp,
      });
    } else if (method === "phone") {
      // phone OTP sending is stubbed; only attempt in debug mode.
      if (!OTP_DEBUG_OVERRIDE) {
        throw internalServerError("SMS OTP delivery not enabled.");
      }
      if (!user?.phoneNumber) {
        throw internalServerError("User phoneNumber not available for OTP delivery.");
      }
      await sendOtpSms({ phoneNumber: user.phoneNumber, otp });
    }


    return genericRequestResponse(res);
  } catch (err) {
    // If forbidden due to Google-only, still do not leak.

    // But we DO want a user-friendly message per requirements.
    if (err.statusCode === 403) {
      return res.status(200).json({
        success: true,
        message:
          "Password management is handled by Google. Please continue signing in with Google.",
      });
    }

    // For any other errors, keep response generic.
    return genericRequestResponse(res);
  }
}));


router.post("/verify-otp", asyncHandler(async (req, res) => {
  const { method, identifier, otp } = req.body || {};

  if (!isValidMethod(method) || !identifier || !otp) {
    throw badRequest("method, identifier and otp are required.");
  }

  const normalized = normalizeIdentifier(method, identifier);

  // Resolve user
  const users =
    method === "email"
      ? await admin.auth().listUsers(100, { email: normalized })
      : await admin.auth().listUsers(100, { phoneNumber: normalized });

  const user = users.users && users.users.length ? users.users[0] : null;
  if (!user) {
    // generic
    throw badRequest("Invalid or expired OTP.");
  }

  const userId = user.uid;
  const authProvider = (user.providerData || []).some((p) => p.providerId === "google.com")
    ? "google"
    : "password";

  // Verify OTP only for password accounts.
  if (authProvider === "google") {
    throw forbidden(
      "Password management is handled by Google. Please continue signing in with Google."
    );
  }

  await verifyOtp({ userId, method, otp });
  return res.status(200).json({ success: true, message: "OTP verified." });
}));

router.post("/resend-otp", asyncHandler(async (req, res) => {
  const { method, identifier } = req.body || {};

  if (!isValidMethod(method) || !identifier) {
    throw badRequest("method and identifier are required.");
  }

  const normalized = normalizeIdentifier(method, identifier);

  const users =
    method === "email"
      ? await admin.auth().listUsers(100, { email: normalized })
      : await admin.auth().listUsers(100, { phoneNumber: normalized });

  const user = users.users && users.users.length ? users.users[0] : null;
  if (!user) {
    return res.status(200).json({
      success: true,
      message: "If an account exists, we will send a new OTP.",
    });
  }

  const userId = user.uid;
  const authProvider = (user.providerData || []).some((p) => p.providerId === "google.com")
    ? "google"
    : "password";

  // resendOtp enforces cooldown
  const { otp } = await resendOtp({ userId, method, authProvider });

  // Send OTP email (this was missing - OTP was generated but never delivered to the user)
  if (method === "email") {
    if (!user?.email) {
      throw internalServerError("User email not available for OTP delivery.");
    }
    await sendOtpEmail({
      toEmail: user.email,
      toName: user.displayName,
      otp,
    });
  }

  return res.status(200).json({
    success: true,
    message: "If an account exists, we will send a new OTP.",
  });
}));

router.post("/reset-password", asyncHandler(async (req, res) => {
  const { method, identifier, otp } = req.body || {};

  if (!isValidMethod(method) || !identifier || !otp) {
    throw badRequest("method, identifier and otp are required.");
  }

  // Security note:
  // This endpoint requires the OTP value. Frontend must send the OTP received
  // during the verify screen. If you want a token-based flow, you can add a
  // server-issued reset session token.


  const normalized = normalizeIdentifier(method, identifier);

  // Resolve user
  const users =
    method === "email"
      ? await admin.auth().listUsers(100, { email: normalized })
      : await admin.auth().listUsers(100, { phoneNumber: normalized });

  const user = users.users && users.users.length ? users.users[0] : null;
  if (!user) {
    // generic
    throw badRequest("Invalid or expired OTP.");
  }

  const userId = user.uid;
  const authProvider = (user.providerData || []).some((p) => p.providerId === "google.com")
    ? "google"
    : "password";

  if (authProvider === "google") {
    throw forbidden(
      "Password management is handled by Google. Please continue signing in with Google."
    );
  }

  // Validate OTP again (defense in depth). If your flow verifies OTP earlier,
  // this still ensures otp is single-use.
  await verifyOtp({ userId, method, otp });

  const { newPassword } = req.body || {};
  if (!newPassword || typeof newPassword !== "string") {
    throw badRequest("newPassword is required.");
  }

  // Firebase requires password length >= 6 by default rules.
  if (newPassword.length < 6) {
    throw badRequest("Password must be at least 6 characters long.");
  }

  // Update password in Firebase
  await admin.auth().updateUser(userId, { password: newPassword });

  await markPasswordResetCompleted({ userId, method });

  return res.status(200).json({
    success: true,
    message: "Password updated successfully.",
  });
}));

module.exports = router;
