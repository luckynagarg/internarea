/**
 * Unified Email Service
 *
 * Primary: Resend
 * Fallback: Gmail SMTP / Nodemailer
 *
 * Existing sendEmail, sendOTPEmail and sendInvoiceEmail
 * interfaces are preserved.
 */

const { Resend } = require('resend');
const nodemailer = require('nodemailer');

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const RESEND_REQUIRED_VARS = ['RESEND_API_KEY', 'EMAIL_FROM'];

const SMTP_REQUIRED_VARS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
];

// ---------------------------------------------------------------------------
// Resend
// ---------------------------------------------------------------------------

let _resend = null;

function getMissingResendEnvVars() {
  return RESEND_REQUIRED_VARS.filter(
    (key) => !process.env[key]
  );
}

function getResend() {
  if (_resend) return _resend;

  const missing = getMissingResendEnvVars();

  if (missing.length > 0) {
    throw new Error(
      `Missing Resend environment variables: ${missing.join(', ')}`
    );
  }

  const apiKey = process.env.RESEND_API_KEY;

  console.log('[email] Resend client initializing', {
    apiKey: '[set - length: ' + apiKey.length + ']',
  });

  _resend = new Resend(apiKey);

  return _resend;
}

function resetResend() {
  _resend = null;
}

// ---------------------------------------------------------------------------
// Gmail SMTP
// ---------------------------------------------------------------------------

let _transporter = null;

/**
 * Validates that all required Resend environment variables are present.
 * Safe to call at startup. NEVER logs or returns secret values.
 *
 * @throws {Error} with a non-sensitive message listing missing variable NAMES.
 */
function validateResendEnvVars() {
  const missing = getMissingResendEnvVars();
  if (missing.length > 0) {
    throw new Error(
      `Missing Resend environment variable(s): ${missing.join(", ")}`
    );
  }
}

function getMissingSmtpEnvVars() {
  return SMTP_REQUIRED_VARS.filter(
    (key) => !process.env[key]
  );
}

function validateSmtpEnvVars() {
  const missing = getMissingSmtpEnvVars();

  if (missing.length > 0) {
    throw new Error(
      `Missing SMTP environment variables: ${missing.join(', ')}`
    );
  }
}

function getTransporter() {
  if (_transporter) return _transporter;

  validateSmtpEnvVars();

  console.log('[email] Gmail SMTP transporter initializing', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER ? '[set]' : '[missing]',
  });

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return _transporter;
}

function resetTransporter() {
  _transporter = null;
}

// ---------------------------------------------------------------------------
// Unified Email Sender
// ---------------------------------------------------------------------------

async function sendEmail({
  toEmail,
  toName,
  subject,
  html,
  text,
  attachments,
  fromEmail,
  fromName,
}) {
  if (!toEmail) {
    throw new Error('Recipient email (toEmail) is required.');
  }

  const senderEmail =
    fromEmail ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM_EMAIL ||
    process.env.SMTP_USER;

  const senderName =
    fromName ||
    process.env.EMAIL_FROM_NAME ||
    'InternArea';

  const from = `${senderName} <${senderEmail}>`;

  console.log('[email] sendEmail attempt', {
    toEmail: '[set]',
    toName: toName ? '[set]' : '[missing]',
    subject: subject
      ? subject.substring(0, 60) +
        (subject.length > 60 ? '...' : '')
      : '[missing]',
    hasHtml: !!html,
    hasText: !!text,
    attachmentCount: attachments
      ? attachments.length
      : 0,
  });

  // -----------------------------------------------------------------------
  // Build common message
  // -----------------------------------------------------------------------

  const plainText =
    text || htmlToPlainText(html);

  // -----------------------------------------------------------------------
  // 1. TRY RESEND
  // -----------------------------------------------------------------------

  if (
    process.env.RESEND_API_KEY &&
    process.env.EMAIL_FROM
  ) {
    try {
      const resend = getResend();

      const message = {
        from,
        to: [toEmail],
        subject,
        html,
        text: plainText,
      };

      if (attachments && attachments.length > 0) {
        message.attachments = [];

        for (const att of attachments) {
          if (att.content) {
            message.attachments.push({
              filename: att.filename,
              content: att.content,
            });
          } else if (att.path) {
            const fs = require('fs');

            const fileBuffer =
              fs.readFileSync(att.path);

            message.attachments.push({
              filename:
                att.filename ||
                att.path.split('/').pop(),
              content:
                fileBuffer.toString('base64'),
            });
          }
        }
      }

      const { data, error } =
        await resend.emails.send(message);

      if (error) {
        throw new Error(error.message);
      }

      console.log('[email] Resend send success', {
        id: data?.id,
      });

      return {
        data,
        error: null,
        provider: 'resend',
      };
    } catch (err) {
      const msg = String(err?.message || err || '');
      // Resend restriction: test keys can only send to the account owner's
      // email until a domain is verified at https://resend.com/domains.
      const hint = /testing emails|verify a domain/i.test(msg)
        ? 'Resend is in TEST MODE — it can only deliver to your own account email. Verify a domain at resend.com/domains and set EMAIL_FROM to an address on that domain to enable all recipients. Falling back to Gmail SMTP.'
        : 'Resend failed, trying Gmail SMTP fallback.';
      console.warn('[email] ' + hint, {
        error: msg,
        provider: 'resend',
      });
    }
  } else {
    console.warn(
      '[email] Resend not configured, using Gmail SMTP'
    );
  }

  // -----------------------------------------------------------------------
  // 2. FALLBACK TO GMAIL SMTP
  // -----------------------------------------------------------------------

  try {
    const transporter = getTransporter();

    const message = {
      from: `${senderName} <${
        process.env.SMTP_FROM_EMAIL ||
        process.env.SMTP_USER
      }>`,
      to: toName
        ? `${toName} <${toEmail}>`
        : toEmail,
      subject,
      html,
      text: plainText,
    };

    if (attachments && attachments.length > 0) {
      message.attachments = [];

      for (const att of attachments) {
        if (att.content) {
          message.attachments.push({
            filename: att.filename,
            content: att.content,
            encoding: 'base64',
          });
        } else if (att.path) {
          message.attachments.push({
            filename:
              att.filename ||
              att.path.split('/').pop(),
            path: att.path,
          });
        }
      }
    }

    const info =
      await transporter.sendMail(message);

    console.log('[email] Gmail SMTP send success', {
      messageId: info?.messageId,
    });

    return {
      data: info,
      error: null,
      provider: 'gmail',
    };
  } catch (err) {
    console.error(
      '[email] Gmail SMTP fallback FAILED',
      {
        error: err.message,
      }
    );

    throw new Error(
      `Email sending failed with both Resend and Gmail SMTP. ${err.message}`
    );
  }
}

// ---------------------------------------------------------------------------
// HTML → Plain Text
// ---------------------------------------------------------------------------

function htmlToPlainText(html) {
  if (!html) return '';

  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// OTP Email
// ---------------------------------------------------------------------------

async function sendOTPEmail(
  email,
  otp,
  options = {}
) {
  const {
    toName,
    subject,
    purpose = 'verification',
    expiryMinutes = 5,
  } = options;

  if (!email) {
    throw new Error(
      'Recipient email is required for OTP email.'
    );
  }

  if (!otp) {
    throw new Error(
      'OTP is required for OTP email.'
    );
  }

  const {
    buildOtpEmailHtml,
    buildOtpPlainText,
  } = require('./emailTemplates');

  const html = buildOtpEmailHtml({
    toName,
    otp,
    purpose,
    expiryMinutes,
  });

  const text = buildOtpPlainText({
    toName,
    otp,
    purpose,
    expiryMinutes,
  });

  return sendEmail({
    toEmail: email,
    toName,
    subject:
      subject ||
      'InternArea - Your One-Time Password (OTP)',
    html,
    text,
  });
}

// ---------------------------------------------------------------------------
// Invoice Email
// ---------------------------------------------------------------------------

async function sendInvoiceEmail({
  toEmail,
  toName,
  subject,
  html,
  attachments,
}) {
  return sendEmail({
    toEmail,
    toName,
    subject,
    html,
    attachments,
  });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  getResend,
  resetResend,

  getTransporter,
  resetTransporter,

  sendEmail,
  sendInvoiceEmail,
  sendOTPEmail,

  validateSmtpEnvVars,
  validateResendEnvVars,
  getMissingSmtpEnvVars,
  getMissingResendEnvVars,

  htmlToPlainText,
};