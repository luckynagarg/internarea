/**
 * Forgot Password service (Task 2 spec).
 *
 * Replaces the previous OTP-based reset with a directly-issued temporary
 * password flow:
 *
 *   1. Reset by registered email OR phone.
 *   2. Only ONE reset request allowed per IST calendar day.
 *   3. Generates a random password containing ONLY letters (uppercase and
 *      lowercase) — NO numbers, NO special characters.
 *   4. Sends the generated password to the user's registered email.
 *   5. If a reset was already requested the same day, returns the message:
 *        "You can use this option only once per day."
 *
 * Security notes:
 *   - We never leak whether an identifier exists (generic responses).
 *   - The generated password is applied via Firebase Admin updateUser.
 */

const crypto = require('crypto');

const { getAdminOrThrow, getAuthOrThrow } = require('../config/firebaseAdmin');
const UserProfile = require('../Model/UserProfile');
const { badRequest, internalServerError } = require('../utils/httpErrors');
const { getISTDayStartInstant } = require('../utils/istHelpers');

const { sendEmail } = require('./emailService');
const { buildForgotPasswordEmailHtml, buildForgotPasswordPlainText } = require('./emailTemplates');

/**
 * Normalizes an identifier.
 * - email -> trimmed, lower-cased
 * - phone -> digits only
 */
function normalizeIdentifier(method, identifier) {
  const v = String(identifier || '').trim();
  if (!v) return '';
  if (method === 'email') return v.toLowerCase();
  if (method === 'phone') return v.replace(/[^0-9]/g, '');
  return v;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Generates a random password containing ONLY uppercase and lowercase
 * letters. No numbers, no special characters.
 *
 * Uses rejection sampling to avoid modulo bias.
 */
function generateLettersOnlyPassword(minLen = 12, maxLen = 14) {
  const length = crypto.randomInt(minLen, maxLen + 1);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const alphabetLen = alphabet.length;
  const maxByte = 256;
  const cutoff = Math.floor(maxByte / alphabetLen) * alphabetLen;

  const result = [];
  while (result.length < length) {
    const byte = crypto.randomBytes(1)[0];
    if (byte >= cutoff) continue;
    result.push(alphabet[byte % alphabetLen]);
  }

  return result.join('');
}

/**
 * Determines whether a reset is allowed, based on the user's LAST requested
 * reset in the project timezone (default Asia/Kolkata) calendar day.
 *
 * @param {Date|null|undefined} lastResetAt
 * @returns {boolean} true if a reset is allowed (different day or never)
 */
function isDailyResetAllowed(lastResetAt) {
  if (!lastResetAt) return true;

  const timeZone = process.env.PAYMENT_TIMEZONE || 'Asia/Kolkata';
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const lastParts = fmt.formatToParts(new Date(lastResetAt));
  const nowParts = fmt.formatToParts(new Date());

  const toKey = (parts) => {
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  };

  return toKey(nowParts) !== toKey(lastParts);
}

/** Structured rejection returned when the daily limit is already consumed. */
function dailyLimitResponse() {
  return {
    success: false,
    code: 'FORGOT_PASSWORD_DAILY_LIMIT',
    message: 'Password reset can only be requested once per day.',
    statusCode: 429,
  };
}

/**
 * Atomically claims today's single password-reset slot for a Firebase user.
 *
 * Race safety: the conditional `findOneAndUpdate` can only match when the stored
 * `lastPasswordResetAt` is missing or strictly before today's IST midnight, so
 * two concurrent requests can never both win. When no profile document exists
 * yet, a `create()` is attempted and a duplicate-key error means another
 * concurrent request already claimed the slot.
 *
 * @returns {Promise<boolean>} true when this request owns the day's reset slot.
 */
async function tryClaimDailyResetSlot(firebaseUid) {
  const dayStart = getISTDayStartInstant(new Date());
  const now = new Date();

  const claimed = await UserProfile.findOneAndUpdate(
    {
      firebaseUid,
      $or: [
        { lastPasswordResetAt: null },
        { lastPasswordResetAt: { $exists: false } },
        { lastPasswordResetAt: { $lt: dayStart } },
      ],
    },
    { $set: { lastPasswordResetAt: now } },
    { new: true }
  );

  if (claimed) return true;

  try {
    await UserProfile.create({ firebaseUid, lastPasswordResetAt: now });
    return true;
  } catch (err) {
    // A profile already exists -> it holds a reset timestamp inside today.
    if (err && err.code === 11000) return false;
    throw err;
  }
}

/**
 * Releases a claimed reset slot (used when the reset itself failed before any
 * password change happened, so the user is not wrongly locked out for the day).
 */
async function releaseDailyResetSlot(firebaseUid) {
  await UserProfile.updateOne(
    { firebaseUid },
    { $set: { lastPasswordResetAt: null } }
  ).catch(() => {});
}

/**
 * Core reset flow.
 *
 * @param {{ method: 'email'|'phone', identifier: string }}
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function resetPassword({ method, identifier }) {
  const normalized = normalizeIdentifier(method, identifier);
  if (!normalized) throw badRequest('A valid email or phone number is required.');

// Resolve the Firebase user by the identifier.
  // Use the v14-compatible Auth service (legacy `admin.auth()` is gone in v14).
  const auth = getAuthOrThrow();
  let user = null;
  try {
    if (method === 'email') {
      try {
        user = await auth.getUserByEmail(normalized);
      } catch (e) {
        // No such user -> user stays null (generic response below).
        user = null;
      }
    } else {
      try {
        user = await auth.getUserByPhoneNumber(normalized);
      } catch (e) {
        user = null;
      }
    }
  } catch (e) {
    throw internalServerError('Password reset service unavailable. Please try again later.');
  }

  // Generic response — never reveal whether an account exists.
  if (!user) {
    return {
      success: true,
      message: 'If an account exists, we will send a new password to your registered email.',
    };
  }

  const uid = user.uid;

  // Google-only accounts cannot be reset via password.
  const providerMethods = (user.providerData || []).map((p) => p.providerId);
  if (providerMethods.includes('google.com')) {
    return {
      success: true,
      message: 'If an account exists, we will send a new password to your registered email.',
    };
  }

  // The user's verified email is required for delivery.
  const toEmail = user.email;
  if (!toEmail) {
    // We cannot deliver; keep generic to avoid leaking.
    return {
      success: true,
      message: 'If an account exists, we will send a new password to your registered email.',
    };
  }

  // ------------------------------------------------------------------
  // Enforce ONE successful reset request per IST calendar day.
  // The slot is claimed atomically (server-side) BEFORE the password is
  // changed, so concurrent requests cannot both reset the account.
  // ------------------------------------------------------------------
  const claimed = await tryClaimDailyResetSlot(uid);
  if (!claimed) {
    return dailyLimitResponse();
  }

  // Generate a letters-only password and apply it via Firebase Admin.
  const newPassword = generateLettersOnlyPassword();
  try {
    await getAuthOrThrow().updateUser(uid, { password: newPassword });
  } catch (e) {
    // No password change happened -> let the user retry today.
    await releaseDailyResetSlot(uid);
    throw internalServerError('Password reset service unavailable. Please try again later.');
  }

  // Send the generated password to the registered email.
  try {
    await sendEmail({
      toEmail,
      toName: user.displayName,
      subject: 'InternArea - Your New Temporary Password',
      html: buildForgotPasswordEmailHtml({
        toName: user.displayName,
        password: newPassword,
      }),
      text: buildForgotPasswordPlainText({
        toName: user.displayName,
        password: newPassword,
      }),
    });
  } catch (e) {
    // Password was already changed; surface a clear error so the user can retry.
    throw internalServerError(
      'Your password was reset, but the email could not be sent. Please contact support.'
    );
  }

  return {
    success: true,
    message: 'A new password has been sent to your registered email.',
  };
}

module.exports = {
  resetPassword,
  generateLettersOnlyPassword,
  normalizeIdentifier,
  isValidEmail,
  isDailyResetAllowed,
  dailyLimitResponse,
  tryClaimDailyResetSlot,
  releaseDailyResetSlot,
};
