/**
 * Centralized Email Templates
 *
 * All email HTML templates live here.
 * Uses inline CSS for maximum email client compatibility.
 * Each template has HTML and plain-text versions.
 */

const { htmlToPlainText } = require('./emailService');

// ---------------------------------------------------------------------------
// OTP Verification Email Template
// ---------------------------------------------------------------------------

/**
 * Builds an OTP verification HTML email.
 *
 * @param {Object} options
 * @param {string} [options.toName] - Recipient's name
 * @param {string} options.otp - The 6-digit OTP
 * @param {string} [options.purpose] - 'verification' | 'login' | 'passwordReset' | 'resumeCreation'
 * @param {number} [options.expiryMinutes=5] - OTP validity in minutes
 * @returns {string} HTML email body
 */
function buildOtpEmailHtml({ toName, otp, purpose = 'verification', expiryMinutes = 5 }) {
  const purposeText = {
    verification: 'Email Verification',
    login: 'Login Verification',
    passwordReset: 'Password Reset',
    resumeCreation: 'Resume Creation',
  }[purpose] || 'Verification';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:30px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:600;">InternArea</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:4px 0 0;">Your Gateway to Opportunities</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px;">${purposeText}</h2>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 4px;">
                Hi ${toName || 'there'},
              </p>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
                Use the following One-Time Password (OTP) to complete your ${purposeText.toLowerCase()}.
                This OTP is valid for <strong>${expiryMinutes} minutes</strong>.
              </p>

              <!-- OTP Box -->
              <div style="background:#f0f5ff;border:2px dashed #2563eb;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <p style="color:#64748b;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Your OTP</p>
                <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#2563eb;font-family:'Courier New',monospace;background:#ffffff;display:inline-block;padding:12px 24px;border-radius:8px;border:1px solid #bfdbfe;">
                  ${otp}
                </div>
                <p style="color:#94a3b8;font-size:12px;margin:12px 0 0;">This code will expire in ${expiryMinutes} minutes.</p>
              </div>

              <!-- Security Notice -->
              <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:6px;padding:14px 18px;margin:0 0 20px;">
                <p style="color:#991b1b;font-size:13px;line-height:1.5;margin:0;">
                  <strong>⚠ Security Alert:</strong> Never share this OTP with anyone.
                  Our team will never ask for your OTP.
                </p>
              </div>

              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0;">
                If you didn't request this, please ignore this email or contact support immediately.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 8px;">
                InternArea &bull; Building Careers, Connecting Talent
              </p>
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
                Need help? <a href="mailto:${process.env.EMAIL_FROM || 'support@internarea.com'}" style="color:#2563eb;text-decoration:none;">Contact Support</a>
              </p>
              <p style="color:#cbd5e1;font-size:11px;margin:16px 0 0;">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds plain-text fallback for OTP email.
 */
function buildOtpPlainText({ toName, otp, purpose = 'verification', expiryMinutes = 5 }) {
  const purposeText = {
    verification: 'Email Verification',
    login: 'Login Verification',
    passwordReset: 'Password Reset',
    resumeCreation: 'Resume Creation',
  }[purpose] || 'Verification';

  return `InternArea - ${purposeText}

Hi ${toName || 'there'},

Use the following OTP to complete your ${purposeText.toLowerCase()}.
This OTP is valid for ${expiryMinutes} minutes.

Your OTP: ${otp}

⚠ Security Alert: Never share this OTP with anyone.

If you didn't request this, please ignore this email or contact support immediately.

InternArea - Building Careers, Connecting Talent`;
}

// ---------------------------------------------------------------------------
// Forgot Password (Generated Password) Email Template
// ---------------------------------------------------------------------------

/**
 * Builds an HTML email delivering a newly generated (letters-only) password.
 *
 * @param {Object} options
 * @param {string} [options.toName] - Recipient's display name
 * @param {string} options.password - The generated letters-only password
 * @returns {string} HTML email body
 */
function buildForgotPasswordEmailHtml({ toName, password }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:30px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:600;">InternArea</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:4px 0 0;">Your Gateway to Opportunities</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px;">Password Reset</h2>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 4px;">
                Hi ${toName || 'there'},
              </p>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
                We received a request to reset your password. A new temporary password has been generated for you below.
              </p>

              <!-- Password Box -->
              <div style="background:#f0f5ff;border:2px dashed #2563eb;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <p style="color:#64748b;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Your New Temporary Password</p>
                <div style="font-size:28px;font-weight:700;letter-spacing:3px;color:#2563eb;font-family:'Courier New',monospace;background:#ffffff;display:inline-block;padding:12px 24px;border-radius:8px;border:1px solid #bfdbfe;word-break:break-all;">
                  ${password}
                </div>
                <p style="color:#94a3b8;font-size:12px;margin:12px 0 0;">Use this to sign in, then change it from your profile.</p>
              </div>

              <!-- Security Notice -->
              <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:6px;padding:14px 18px;margin:0 0 20px;">
                <p style="color:#991b1b;font-size:13px;line-height:1.5;margin:0;">
                  <strong>⚠ Security Alert:</strong> Never share this password with anyone.
                  You can use the "Forgot Password" option only once per day.
                </p>
              </div>

              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0;">
                If you didn't request this, please contact support immediately.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 8px;">
                InternArea &bull; Building Careers, Connecting Talent
              </p>
              <p style="color:#cbd5e1;font-size:11px;margin:16px 0 0;">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds plain-text fallback for the forgot-password email.
 */
function buildForgotPasswordPlainText({ toName, password }) {
  return `InternArea - Password Reset

Hi ${toName || 'there'},

We received a request to reset your password. A new temporary password has been generated for you below:

Your New Temporary Password: ${password}

Use this to sign in, then change it from your profile.

⚠ Security Alert: Never share this password with anyone.
You can use the "Forgot Password" option only once per day.

If you didn't request this, please contact support immediately.

InternArea - Building Careers, Connecting Talent`;
}

// ---------------------------------------------------------------------------
// Subscription Invoice Email Template
// ---------------------------------------------------------------------------

/**
 * Builds an invoice email HTML for subscription activation.
 */
function buildInvoiceEmailHtml({ planName, amountPaid, paymentId, invoiceNumber, startDate, expiryDate }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#047857);padding:30px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:22px;margin:0 0 4px;font-weight:600;">Subscription Activated 🎉</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">Thank you for subscribing!</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 4px;">Hi,</p>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Your payment has been verified and your subscription is now active. Here are your invoice details:
              </p>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:0 0 24px;">
                <table width="100%" cellpadding="6" cellspacing="0">
                  <tr>
                    <td style="color:#64748b;font-size:13px;width:160px;">Plan</td>
                    <td style="color:#1e293b;font-size:14px;font-weight:500;">${planName}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;font-size:13px;">Amount Paid</td>
                    <td style="color:#1e293b;font-size:14px;font-weight:600;">₹${amountPaid}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;font-size:13px;">Payment ID</td>
                    <td style="color:#1e293b;font-size:13px;font-family:monospace;">${paymentId}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;font-size:13px;">Invoice Number</td>
                    <td style="color:#1e293b;font-size:13px;font-family:monospace;">${invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;font-size:13px;">Start Date</td>
                    <td style="color:#1e293b;font-size:14px;">${new Date(startDate).toDateString()}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;font-size:13px;">Expiry Date</td>
                    <td style="color:#dc2626;font-size:14px;font-weight:500;">${new Date(expiryDate).toDateString()}</td>
                  </tr>
                </table>
              </div>

              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0;">
                You can also download your PDF invoice from your dashboard.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">InternArea &bull; Building Careers, Connecting Talent</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds plain-text fallback for invoice email.
 */
function buildInvoicePlainText({ planName, amountPaid, paymentId, invoiceNumber, startDate, expiryDate }) {
  return `InternArea - Subscription Activated 🎉

Hi,

Your payment has been verified and your subscription is now active.

Invoice Details:
- Plan: ${planName}
- Amount Paid: ₹${amountPaid}
- Payment ID: ${paymentId}
- Invoice Number: ${invoiceNumber}
- Start Date: ${new Date(startDate).toDateString()}
- Expiry Date: ${new Date(expiryDate).toDateString()}

You can download your PDF invoice from your dashboard.

InternArea - Building Careers, Connecting Talent`;
}

// ---------------------------------------------------------------------------
// Contact/Query Confirmation Email Template
// ---------------------------------------------------------------------------

function buildQueryConfirmationHtml({ userName, querySubject, queryMessage, ticketId }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:30px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:22px;margin:0 0 4px;font-weight:600;">Query Received ✅</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">We'll get back to you shortly</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 4px;">Hi ${userName || 'there'},</p>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Thank you for reaching out to us. We have received your query and our support team will respond within 24-48 hours.
              </p>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:0 0 24px;">
                <p style="color:#64748b;font-size:13px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Ticket Information</p>
                ${ticketId ? `<p style="color:#1e293b;font-size:14px;margin:0 0 12px;"><strong>Ticket ID:</strong> ${ticketId}</p>` : ''}
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;padding:14px;">
                  <p style="color:#475569;font-size:14px;margin:0 0 6px;"><strong>Subject:</strong> ${querySubject || 'N/A'}</p>
                  <p style="color:#475569;font-size:14px;margin:0;white-space:pre-wrap;"><strong>Message:</strong><br/>${queryMessage || 'N/A'}</p>
                </div>
              </div>

              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0;">
                In the meantime, you can explore our <a href="https://internarea-nine.vercel.app" style="color:#2563eb;">platform</a> for internships, jobs, and more.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
                InternArea &bull; <a href="mailto:${process.env.EMAIL_FROM || 'support@internarea.com'}" style="color:#2563eb;">Contact Support</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildQueryConfirmationPlainText({ userName, querySubject, queryMessage, ticketId }) {
  return `InternArea - Query Received ✅

Hi ${userName || 'there'},

Thank you for reaching out to us. We have received your query and our support team will respond within 24-48 hours.

Ticket ID: ${ticketId || 'N/A'}
Subject: ${querySubject || 'N/A'}
Message: ${queryMessage || 'N/A'}

InternArea - Building Careers, Connecting Talent`;
}

// ---------------------------------------------------------------------------
// Admin Query Notification Email Template
// ---------------------------------------------------------------------------

function buildAdminQueryNotificationHtml({ userName, userEmail, querySubject, queryMessage, ticketId }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:30px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:22px;margin:0 0 4px;font-weight:600;">New User Query 📬</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">Action Required</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <p style="color:#1e293b;font-size:16px;font-weight:600;margin:0 0 16px;">A user has submitted a new support query.</p>

              <div style="background:#f0f5ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:0 0 16px;">
                <table width="100%" cellpadding="4" cellspacing="0">
                  <tr><td style="color:#64748b;font-size:13px;width:100px;">Name:</td><td style="color:#1e293b;font-size:14px;font-weight:500;">${userName || 'Not provided'}</td></tr>
                  <tr><td style="color:#64748b;font-size:13px;">Email:</td><td style="color:#2563eb;font-size:14px;"><a href="mailto:${userEmail}" style="color:#2563eb;">${userEmail}</a></td></tr>
                  ${ticketId ? `<tr><td style="color:#64748b;font-size:13px;">Ticket ID:</td><td style="color:#1e293b;font-size:14px;font-family:monospace;">${ticketId}</td></tr>` : ''}
                </table>
              </div>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 16px;">
                <p style="color:#64748b;font-size:13px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Subject</p>
                <p style="color:#1e293b;font-size:15px;font-weight:500;margin:0 0 16px;">${querySubject || 'No subject'}</p>
                <p style="color:#64748b;font-size:13px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Message</p>
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;padding:14px;">
                  <p style="color:#475569;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${queryMessage || 'No message'}</p>
                </div>
              </div>

              <div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;padding:14px 18px;">
                <p style="color:#991b1b;font-size:13px;line-height:1.5;margin:0;">
                  <strong>Next Step:</strong> Reply to the user at <a href="mailto:${userEmail}" style="color:#2563eb;">${userEmail}</a>
                  to address their query.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 40px;">
              <a href="mailto:${userEmail}?subject=Re: ${encodeURIComponent(querySubject || 'Your Query')}"
                 style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:500;">
                ✉️ Reply to User
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
                InternArea &bull; Admin Notification &bull; ${new Date().toLocaleString()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildAdminQueryNotificationPlainText({ userName, userEmail, querySubject, queryMessage, ticketId }) {
  return `InternArea - New User Query 📬 (Action Required)

A user has submitted a new support query.

Name: ${userName || 'Not provided'}
Email: ${userEmail}
Ticket ID: ${ticketId || 'N/A'}
Subject: ${querySubject || 'No subject'}
Message: ${queryMessage || 'No message'}

Action: Reply to ${userEmail} to address their query.

InternArea - Admin Notification - ${new Date().toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Generic Notification Email Template
// ---------------------------------------------------------------------------

function buildNotificationEmailHtml({ toName, title, message, type, actionUrl, actionText }) {
  const typeColors = {
    application: '#2563eb',
    internship: '#059669',
    announcement: '#d97706',
    social: '#7c3aed',
    admin: '#dc2626',
  };
  const accentColor = typeColors[type] || '#2563eb';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:linear-gradient(135deg,${accentColor},${accentColor}dd);padding:30px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:600;">${title || 'Notification'}</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 4px;">Hi ${toName || 'there'},</p>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">${message}</p>

              ${actionUrl ? `<p style="text-align:center;margin:24px 0;">
                <a href="${actionUrl}" style="display:inline-block;background:${accentColor};color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:500;">${actionText || 'View Details'}</a>
              </p>` : ''}
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">InternArea &bull; Building Careers, Connecting Talent</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildNotificationPlainText({ toName, title, message, actionUrl }) {
  let text = `InternArea - ${title || 'Notification'}\n\nHi ${toName || 'there'},\n\n${message}\n`;
  if (actionUrl) text += `\n${actionUrl}\n`;
  text += `\nInternArea - Building Careers, Connecting Talent`;
  return text;
}

// ---------------------------------------------------------------------------
// Email Verification (Firebase Link) Template
// ---------------------------------------------------------------------------

/**
 * Builds an email verification HTML email using Firebase's built-in verification link.
 *
 * @param {Object} options
 * @param {string} [options.toName] - Recipient's name
 * @param {string} options.verificationLink - Firebase email verification link
 * @returns {string} HTML email body
 */
function buildVerificationEmailHtml({ toName, verificationLink }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:30px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:600;">InternArea</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:4px 0 0;">Your Gateway to Opportunities</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px;">Verify Your Email Address</h2>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 4px;">
                Hi ${toName || 'there'},
              </p>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
                Thank you for creating an account with InternArea. Please click the button below to verify your email address and gain full access to all features.
              </p>

              <!-- Verification Button -->
              <div style="text-align:center;margin:0 0 24px;">
                <a href="${verificationLink}"
                   style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;">
                  Verify Email Address
                </a>
              </div>

              <!-- Fallback link -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 24px;">
                <p style="color:#64748b;font-size:13px;margin:0 0 8px;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="color:#2563eb;font-size:12px;word-break:break-all;margin:0;font-family:monospace;">${verificationLink}</p>
              </div>

              <!-- Expiry Notice -->
              <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:6px;padding:14px 18px;margin:0 0 20px;">
                <p style="color:#991b1b;font-size:13px;line-height:1.5;margin:0;">
                  <strong>⏰ Link Expiry:</strong> This verification link will expire in a few hours. If it expires, you can request a new one from your account settings.
                </p>
              </div>

              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0;">
                If you didn't create an account, please ignore this email or contact support immediately.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 8px;">
                InternArea &bull; Building Careers, Connecting Talent
              </p>
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
                Need help? <a href="mailto:${process.env.EMAIL_FROM || 'support@internarea.com'}" style="color:#2563eb;text-decoration:none;">Contact Support</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds plain-text fallback for email verification.
 */
function buildVerificationPlainText({ toName, verificationLink }) {
  return `InternArea - Verify Your Email Address

Hi ${toName || 'there'},

Thank you for creating an account with InternArea. Please verify your email address by visiting the link below:

${verificationLink}

⏰ This link will expire in a few hours. If it expires, you can request a new one from your account settings.

If you didn't create an account, please ignore this email.

InternArea - Building Careers, Connecting Talent`;
}

// ---------------------------------------------------------------------------
// Email Verification Email Template (Firebase verification link)
// ---------------------------------------------------------------------------

/**
 * Builds an HTML email for Firebase email verification.
 * @param {Object} options
 * @param {string} [options.toName] - Recipient's name
 * @param {string} options.verificationUrl - The Firebase email verification link
 * @returns {string} HTML email body
 */
function buildEmailVerificationSentHtml({ toName, verificationUrl }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:30px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:600;">InternArea</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:4px 0 0;">Verify Your Email Address</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px;">Welcome to InternArea!</h2>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 4px;">
                Hi ${toName || 'there'},
              </p>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
                Thank you for creating an account. Please verify your email address by clicking the button below.
              </p>

              <!-- Verification Button -->
              <div style="text-align:center;margin:24px 0;">
                <a href="${verificationUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">
                  Verify Email Address
                </a>
              </div>

              <p style="color:#64748b;font-size:13px;line-height:1.5;margin:0 0 20px;text-align:center;">
                Or copy and paste this link in your browser:<br/>
                <span style="color:#2563eb;font-size:12px;word-break:break-all;">${verificationUrl}</span>
              </p>

              <!-- Security Notice -->
              <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:6px;padding:14px 18px;margin:0 0 20px;">
                <p style="color:#991b1b;font-size:13px;line-height:1.5;margin:0;">
                  <strong>⚠ Security Alert:</strong> If you didn't create this account, please ignore this email.
                </p>
              </div>

              <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">
                This link will expire in 24 hours for security purposes.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
                InternArea &bull; Building Careers, Connecting Talent
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailVerificationSentPlainText({ toName, verificationUrl }) {
  return `InternArea - Verify Your Email Address

Hi ${toName || 'there'},

Thank you for creating an account. Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours for security purposes.

If you didn't create this account, please ignore this email.

InternArea - Building Careers, Connecting Talent`;
}

/**
 * Builds an HTML email confirming email verification success.
 */
function buildEmailVerifiedHtml({ toName }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:linear-gradient(135deg,#059669,#047857);padding:30px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:600;">Email Verified ✅</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:4px 0 0;">Your account is now active</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <div style="text-align:center;margin:0 0 24px;">
                <div style="display:inline-block;width:64px;height:64px;background:#d1fae5;border-radius:50%;line-height:64px;font-size:32px;">✅</div>
              </div>
              <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px;text-align:center;">Verification Complete!</h2>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 4px;">
                Hi ${toName || 'there'},
              </p>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
                Your email has been successfully verified. You can now access all features of InternArea.
              </p>

              <div style="text-align:center;margin:24px 0;">
                <a href="https://internarea-nine.vercel.app/login" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:500;">
                  Sign In to Your Account
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">InternArea &bull; Building Careers, Connecting Talent</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailVerifiedPlainText({ toName }) {
  return `InternArea - Email Verified ✅

Hi ${toName || 'there'},

Your email has been successfully verified. You can now access all features of InternArea.

Sign in at: https://internarea-nine.vercel.app/login

InternArea - Building Careers, Connecting Talent`;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Sends a templated email using the unified sendEmail service.
 * Kept for backward compatibility with contact.js and other routes.
 *
 * @deprecated Use sendEmail from emailService.js directly for new code.
 */
const { sendEmail } = require('./emailService');

async function sendTemplatedEmail({ toEmail, toName, subject, html }) {
  return sendEmail({ toEmail, toName, subject, html });
}

module.exports = {
  // OTP templates
  buildOtpEmailHtml,
  buildOtpPlainText,

  // Forgot-password (generated password) templates
  buildForgotPasswordEmailHtml,
  buildForgotPasswordPlainText,

  // Invoice templates
  buildInvoiceEmailHtml,
  buildInvoicePlainText,

  // Contact form templates
  buildQueryConfirmationHtml,
  buildQueryConfirmationPlainText,
  buildAdminQueryNotificationHtml,
  buildAdminQueryNotificationPlainText,

  // Notification templates
  buildNotificationEmailHtml,
  buildNotificationPlainText,

  // Email verification templates (Firebase link)
  buildVerificationEmailHtml,
  buildVerificationPlainText,

  // Email verification templates (custom)
  buildEmailVerificationSentHtml,
  buildEmailVerificationSentPlainText,
  buildEmailVerifiedHtml,
  buildEmailVerifiedPlainText,

  // Legacy helper
  sendTemplatedEmail,
};

