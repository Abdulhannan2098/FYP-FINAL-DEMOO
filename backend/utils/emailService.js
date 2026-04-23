const nodemailer = require('nodemailer');
require('dotenv').config();

const BRAND_NAME = process.env.EMAIL_BRAND_NAME || process.env.EMAIL_FROM_NAME || 'AutoSphere';
const EMAIL_FROM_DISPLAY_NAME = 'Autosphere Notifications';
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@autosphere.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@autosphere.com';
const VENDOR_SUPPORT_EMAIL = process.env.VENDOR_SUPPORT_EMAIL || 'vendor-support@autosphere.com';
const PRIMARY_COLOR = process.env.EMAIL_PRIMARY_COLOR || '#991B1B';
const DARK_BG = process.env.EMAIL_DARK_BG || '#111827';

const escapeHtml = (value) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const escapeAttr = (value) => escapeHtml(value).replace(/\s/g, (m) => (m === ' ' ? '%20' : m));

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (amount) => {
  const currency = process.env.CURRENCY || 'PKR';
  try {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency }).format(toNumber(amount));
  } catch {
    return `PKR ${toNumber(amount).toFixed(2)}`;
  }
};

const formatDateTime = (date = new Date()) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return new Date(date).toLocaleString();
  }
};

const renderButton = (label, url) => {
  if (!label || !url) return '';
  const safeLabel = escapeHtml(label);
  const safeUrl = escapeAttr(url);
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 20px auto 0 auto;">
      <tr>
        <td bgcolor="${PRIMARY_COLOR}" align="center" style="border-radius: 10px;mso-padding-alt:12px 18px;">
          <a href="${safeUrl}" target="_blank" rel="noopener" style="display:inline-block;background:${PRIMARY_COLOR};background-color:${PRIMARY_COLOR};padding:12px 18px;border-radius:10px;border:1px solid ${PRIMARY_COLOR};color:#ffffff !important;text-decoration:none !important;font-weight:700;font-size:14px;line-height:14px;mso-line-height-rule:exactly;">
            <span style="color:#ffffff !important;text-decoration:none !important;">${safeLabel}</span>
          </a>
        </td>
      </tr>
    </table>
  `;
};

const renderCard = ({
  preheader,
  heading,
  greeting,
  lead,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footerNote,
}) => {
  const safePreheader = escapeHtml(preheader || '');
  const safeHeading = escapeHtml(heading || BRAND_NAME);
  const safeGreeting = greeting ? `<p style="margin:0 0 12px 0;font-size:16px;line-height:24px;color:#111827;">${escapeHtml(greeting)}</p>` : '';
  const safeLead = lead
    ? `<p style="margin:0 0 16px 0;font-size:14px;line-height:22px;color:#374151;">${escapeHtml(lead)}</p>`
    : '';
  const safeFooterNote = footerNote
    ? `<p style="margin:10px 0 0 0;font-size:12px;line-height:18px;color:#6B7280;">${escapeHtml(footerNote)}</p>`
    : '';

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${safeHeading}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F3F4F6;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${safePreheader}</div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F3F4F6;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;">
            <tr>
              <td style="background:${DARK_BG};padding:18px 22px;border-radius:16px 16px 0 0;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:22px;font-weight:800;color:#ffffff;">${escapeHtml(
                  BRAND_NAME
                )}</div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#D1D5DB;margin-top:4px;">${safeHeading}</div>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;padding:24px 22px;border-radius:0 0 16px 16px;">
                ${safeGreeting}
                ${safeLead}
                ${bodyHtml || ''}
                ${renderButton(ctaLabel, ctaUrl)}
                <hr style="border:none;border-top:1px solid #E5E7EB;margin:22px 0 14px 0;" />
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6B7280;">
                  Need help? Contact <a href="mailto:${escapeAttr(SUPPORT_EMAIL)}" style="color:${PRIMARY_COLOR};text-decoration:none;">${escapeHtml(
    SUPPORT_EMAIL
  )}</a>.
                </p>
                ${safeFooterNote}
                <p style="margin:10px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:#9CA3AF;">
                  © ${new Date().getFullYear()} ${escapeHtml(BRAND_NAME)}. This is an automated message.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
};

const renderOtpBlock = ({ label, otp, note }) => {
  const safeLabel = escapeHtml(label || 'Verification code');
  const safeOtp = escapeHtml(otp || '');
  const safeNote = note ? escapeHtml(note) : '';

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 8px 0;border:1px solid #E5E7EB;border-radius:14px;">
      <tr>
        <td align="center" style="padding:18px 14px;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;">
            ${safeLabel}
          </div>
          <div style="margin:10px 0 8px 0;font-family:Courier New,Courier,monospace;font-size:34px;line-height:40px;font-weight:800;color:${PRIMARY_COLOR};letter-spacing:8px;">
            ${safeOtp}
          </div>
          ${safeNote ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;color:#6B7280;">${safeNote}</div>` : ''}
        </td>
      </tr>
    </table>
  `;
};

// Cached transporter instance
let cachedTransporter = null;

// Create transporter based on environment
const createTransporter = () => {
  // Only use console mode if explicitly set AND we want to skip real emails
  if (process.env.EMAIL_SERVICE === 'console') {
    console.log('⚠️  Email service running in CONSOLE mode - emails will NOT be delivered');
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
  }

  // Production/SMTP mode: Use real Gmail SMTP
  const transportConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: parseInt(process.env.EMAIL_PORT) === 465, // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    // Gmail specific settings for better reliability
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
  };

  console.log('📧 Email service configured for SMTP delivery to:', process.env.EMAIL_HOST || 'smtp.gmail.com');
  return nodemailer.createTransport(transportConfig);
};

// Get or create transporter (singleton pattern for connection reuse)
const getTransporter = () => {
  if (!cachedTransporter) {
    cachedTransporter = createTransporter();
  }
  return cachedTransporter;
};

// Verify SMTP connection
const verifyConnection = async () => {
  try {
    if (process.env.EMAIL_SERVICE === 'console') {
      return { success: true, mode: 'console' };
    }
    const transporter = getTransporter();
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    return { success: true, mode: 'smtp' };
  } catch (error) {
    console.error('❌ SMTP connection verification failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Send email utility
const sendEmail = async (options) => {
  try {
    // Check if SMTP credentials are configured
    const hasCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASSWORD;
    const isConsoleMode = process.env.EMAIL_SERVICE === 'console';

    // Only fall back to console if explicitly set to console mode
    // If credentials are missing but not in console mode, throw error
    if (!hasCredentials && !isConsoleMode) {
      console.error('❌ Email credentials not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env');
      return { success: false, error: 'Email credentials not configured' };
    }

    const mailOptions = {
      from: `"${EMAIL_FROM_DISPLAY_NAME}" <${EMAIL_FROM_ADDRESS}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    if (isConsoleMode) {
      // Console mode: Log email details (for debugging only)
      console.log('\n' + '='.repeat(80));
      console.log('📧 EMAIL (Console Mode - NOT DELIVERED)');
      console.log('='.repeat(80));
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      if (options.text) {
        console.log('-'.repeat(80));
        console.log('Text Content:');
        console.log(options.text);
      }
      console.log('='.repeat(80) + '\n');
      return { success: true, mode: 'console', messageId: `console-${Date.now()}` };
    }

    // SMTP mode: Send actual email
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log('✉️  Email sent successfully to:', options.to, '| MessageID:', info.messageId);
    return { success: true, mode: 'smtp', messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed to:', options.to);
    console.error('   Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    return { success: false, error: error.message };
  }
};

// Email templates
const templates = {
  emailVerification: (userName, otp) => {
    const subject = `Verify your email address - ${BRAND_NAME}`;
    const text = [
      `${BRAND_NAME} — Email verification`,
      '',
      `Hello ${userName},`,
      '',
      `Your verification code is: ${otp}`,
      'This code expires in 10 minutes.',
      '',
      `If you did not create an account, you can ignore this email.`,
    ].join('\n');

    const html = renderCard({
      preheader: 'Use this code to verify your email address.',
      heading: 'Email verification',
      greeting: `Hello ${userName},`,
      lead: 'Use the verification code below to finish setting up your account.',
      bodyHtml: `
        ${renderOtpBlock({ label: 'Verification code', otp, note: 'Expires in 10 minutes.' })}
        <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6B7280;">
          If you did not create an account, you can safely ignore this email.
        </p>
      `,
      footerNote: 'For security reasons, never share this code with anyone.',
    });

    return { subject, text, html };
  },

  passwordReset: (userName, resetToken, resetUrl) => {
    const subject = `Password reset code - ${BRAND_NAME}`;
    const text = [
      `${BRAND_NAME} — Password reset`,
      '',
      `Hello ${userName},`,
      '',
      `Your password reset code is: ${resetToken}`,
      'This code expires in 10 minutes.',
      '',
      `Continue in the app: ${resetUrl}`,
      '',
      `If you did not request this, you can ignore this email.`,
    ].join('\n');

    const html = renderCard({
      preheader: 'Use this code to reset your password.',
      heading: 'Password reset',
      greeting: `Hello ${userName},`,
      lead: 'We received a request to reset your password. Use the code below to continue.',
      bodyHtml: `
        ${renderOtpBlock({ label: 'Password reset code', otp: resetToken, note: 'Expires in 10 minutes.' })}
        <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6B7280;">
          Security tip: ${escapeHtml(BRAND_NAME)} staff will never ask you for this code.
        </p>
      `,
      ctaLabel: 'Continue to verification',
      ctaUrl: resetUrl,
      footerNote: 'If you did not request a password reset, no action is required.',
    });

    return { subject, text, html };
  },

  passwordChangeNotification: (userName) => {
    const when = formatDateTime(new Date());
    const subject = `Password changed - ${BRAND_NAME}`;
    const resetLink = `${FRONTEND_URL}/forgot-password`;

    const text = [
      `${BRAND_NAME} — Security notice`,
      '',
      `Hello ${userName},`,
      '',
      `Your password was changed on ${when}.`,
      '',
      `If this was not you, reset your password immediately: ${resetLink}`,
      `Support: ${SUPPORT_EMAIL}`,
    ].join('\n');

    const html = renderCard({
      preheader: 'A password change was made to your account.',
      heading: 'Security notification',
      greeting: `Hello ${userName},`,
      lead: `Your account password was changed on ${when}.`,
      bodyHtml: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0 0 0;border:1px solid #FEF3C7;background:#FFFBEB;border-radius:14px;">
          <tr>
            <td style="padding:14px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#92400E;">
              <strong style="color:#92400E;">Didn't make this change?</strong><br />
              Reset your password immediately and contact support.
            </td>
          </tr>
        </table>
      `,
      ctaLabel: 'Reset password',
      ctaUrl: resetLink,
      footerNote: 'If you made this change, no further action is required.',
    });

    return { subject, text, html };
  },

  welcome: (userName, userRole) => {
    const subject = `Welcome to ${BRAND_NAME}`;

    const roleLine = userRole ? `Account type: ${userRole}` : '';
    const text = [
      `${BRAND_NAME} — Welcome`,
      '',
      `Hello ${userName},`,
      '',
      'Your account is ready.',
      roleLine,
      '',
      `Sign in: ${FRONTEND_URL}/login`,
    ]
      .filter(Boolean)
      .join('\n');

    const nextSteps = (() => {
      if (userRole === 'vendor') {
        return `
          <ul style="margin:0;padding-left:18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">
            <li>Add your first products</li>
            <li>Complete your vendor profile</li>
            <li>Review orders from customers</li>
          </ul>
        `;
      }
      if (userRole === 'customer') {
        return `
          <ul style="margin:0;padding-left:18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">
            <li>Browse products from multiple vendors</li>
            <li>Save items to your wishlist</li>
            <li>Checkout securely</li>
          </ul>
        `;
      }
      return '';
    })();

    const html = renderCard({
      preheader: `Welcome to ${BRAND_NAME}. Your account is ready.`,
      heading: 'Welcome',
      greeting: `Hello ${userName},`,
      lead: `Thanks for joining ${BRAND_NAME}. Your account has been created successfully.`,
      bodyHtml: `
        ${userRole ? `<p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;"><strong>Account type:</strong> ${escapeHtml(
          userRole
        )}</p>` : ''}
        ${nextSteps}
      `,
      ctaLabel: 'Open AutoSphere',
      ctaUrl: FRONTEND_URL,
      footerNote: 'If you did not create this account, contact support.',
    });

    return { subject, text, html };
  },

  vendorRegistrationAcknowledgment: (vendorName, businessName) => {
    const subject = `Vendor application received - ${BRAND_NAME}`;
    const text = [
      `${BRAND_NAME} — Vendor application`,
      '',
      `Hello ${vendorName},`,
      '',
      'We received your vendor application and it is under review.',
      businessName ? `Business name: ${businessName}` : '',
      '',
      `Questions? ${VENDOR_SUPPORT_EMAIL}`,
    ]
      .filter(Boolean)
      .join('\n');

    const html = renderCard({
      preheader: 'Your vendor application is under review.',
      heading: 'Vendor application',
      greeting: `Hello ${vendorName},`,
      lead: `Thanks for applying to become a vendor on ${BRAND_NAME}. Our team will review your application in 1–2 business days.`,
      bodyHtml: `
        ${businessName ? `<p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;"><strong>Business name:</strong> ${escapeHtml(
          businessName
        )}</p>` : ''}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #E5E7EB;border-radius:14px;">
          <tr>
            <td style="padding:14px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">
              <strong>What happens next</strong>
              <ul style="margin:10px 0 0 0;padding-left:18px;">
                <li>We review your application</li>
                <li>We email you our decision</li>
                <li>If approved, you can start listing products</li>
              </ul>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6B7280;">
          Questions? Email <a href="mailto:${escapeAttr(VENDOR_SUPPORT_EMAIL)}" style="color:${PRIMARY_COLOR};text-decoration:none;">${escapeHtml(
    VENDOR_SUPPORT_EMAIL
  )}</a>.
        </p>
      `,
    });

    return { subject, text, html };
  },

  vendorDecision: (vendorName, isApproved, rejectionReason = '') => {
    const subject = isApproved
      ? `Vendor application approved - ${BRAND_NAME}`
      : `Vendor application update - ${BRAND_NAME}`;

    const dashboardUrl = `${FRONTEND_URL}/dashboard/vendor`;
    const text = [
      `${BRAND_NAME} — Vendor application`,
      '',
      `Hello ${vendorName},`,
      '',
      isApproved ? 'Your vendor application has been approved.' : 'Your vendor application was not approved at this time.',
      rejectionReason ? `Reason: ${rejectionReason}` : '',
      '',
      isApproved ? `Vendor dashboard: ${dashboardUrl}` : `Questions: ${VENDOR_SUPPORT_EMAIL}`,
    ]
      .filter(Boolean)
      .join('\n');

    const bodyHtml = isApproved
      ? `
        <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">
          Your vendor application has been approved. You can now access your vendor dashboard.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #D1FAE5;background:#ECFDF5;border-radius:14px;">
          <tr>
            <td style="padding:14px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#065F46;">
              <strong>Next steps</strong>
              <ul style="margin:10px 0 0 0;padding-left:18px;">
                <li>Complete your store profile</li>
                <li>Add your products</li>
                <li>Start fulfilling orders</li>
              </ul>
            </td>
          </tr>
        </table>
      `
      : `
        <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">
          After careful review, your vendor application was not approved at this time.
        </p>
        ${rejectionReason
          ? `
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #FEE2E2;background:#FEF2F2;border-radius:14px;">
              <tr>
                <td style="padding:14px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#991B1B;">
                  <strong>Reason</strong><br />
                  ${escapeHtml(rejectionReason)}
                </td>
              </tr>
            </table>
          `
          : ''}
        <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6B7280;">
          Questions? Email <a href="mailto:${escapeAttr(VENDOR_SUPPORT_EMAIL)}" style="color:${PRIMARY_COLOR};text-decoration:none;">${escapeHtml(
    VENDOR_SUPPORT_EMAIL
  )}</a>.
        </p>
      `;

    const html = renderCard({
      preheader: isApproved ? 'Your vendor application has been approved.' : 'Update on your vendor application.',
      heading: 'Vendor application',
      greeting: `Hello ${vendorName},`,
      lead: isApproved ? 'Good news — your application is approved.' : 'Here is an update on your vendor application.',
      bodyHtml,
      ctaLabel: isApproved ? 'Open vendor dashboard' : null,
      ctaUrl: isApproved ? dashboardUrl : null,
    });

    return { subject, text, html };
  },

  vendorVerificationApproved: (vendorName, businessName) => {
    const subject = `Vendor verification approved - ${BRAND_NAME}`;
    const dashboardUrl = `${FRONTEND_URL}/dashboard/vendor`;

    const text = [
      `${BRAND_NAME} — Verification approved`,
      '',
      `Hello ${vendorName},`,
      '',
      'Congratulations! Your vendor verification has been approved.',
      businessName ? `Business: ${businessName}` : '',
      '',
      'You now have full access to your vendor dashboard:',
      '- Create and manage products',
      '- Access orders',
      '- Upload 3D models for AR preview',
      '',
      `Start selling: ${dashboardUrl}`,
    ]
      .filter(Boolean)
      .join('\n');

    const html = renderCard({
      preheader: 'Your vendor verification has been approved!',
      heading: 'Verification approved',
      greeting: `Hello ${vendorName},`,
      lead: `Congratulations! Your identity verification for ${businessName || 'your business'} has been successfully completed.`,
      bodyHtml: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0;border:1px solid #D1FAE5;background:#ECFDF5;border-radius:14px;">
          <tr>
            <td style="padding:14px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#065F46;">
              <strong style="font-size:15px;">You're all set!</strong>
              <p style="margin:10px 0 0 0;">Your vendor account is now fully verified. You have access to all vendor features:</p>
              <ul style="margin:10px 0 0 0;padding-left:18px;">
                <li>Create and manage product listings</li>
                <li>Upload 3D models for AR preview</li>
                <li>Receive and fulfill customer orders</li>
                <li>Access sales analytics</li>
              </ul>
            </td>
          </tr>
        </table>
      `,
      ctaLabel: 'Go to Vendor Dashboard',
      ctaUrl: dashboardUrl,
      footerNote: 'Thank you for joining AutoSphere as a verified vendor.',
    });

    return { subject, text, html };
  },

  vendorVerificationFailed: (vendorName, reason) => {
    const subject = `Vendor verification update - ${BRAND_NAME}`;
    const retryUrl = `${FRONTEND_URL}/vendor/verification`;

    const text = [
      `${BRAND_NAME} — Verification update`,
      '',
      `Hello ${vendorName},`,
      '',
      'Your vendor verification was not successful.',
      reason ? `Reason: ${reason}` : '',
      '',
      'You can retry the verification process by logging into your account.',
      `Retry: ${retryUrl}`,
      '',
      `Questions? ${VENDOR_SUPPORT_EMAIL}`,
    ]
      .filter(Boolean)
      .join('\n');

    const html = renderCard({
      preheader: 'Your vendor verification needs attention.',
      heading: 'Verification update',
      greeting: `Hello ${vendorName},`,
      lead: 'We were unable to complete your vendor verification at this time.',
      bodyHtml: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0;border:1px solid #FEE2E2;background:#FEF2F2;border-radius:14px;">
          <tr>
            <td style="padding:14px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#991B1B;">
              <strong>Issue found:</strong>
              <p style="margin:8px 0 0 0;">${escapeHtml(reason || 'Verification checks did not pass.')}</p>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">
          <strong>What you can do:</strong>
        </p>
        <ul style="margin:8px 0 0 0;padding-left:18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">
          <li>Ensure your CNIC images are clear and readable</li>
          <li>Verify your profile name matches your CNIC</li>
          <li>Ensure your CNIC number is correct</li>
        </ul>
        <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6B7280;">
          Questions? Email <a href="mailto:${escapeAttr(VENDOR_SUPPORT_EMAIL)}" style="color:${PRIMARY_COLOR};text-decoration:none;">${escapeHtml(
    VENDOR_SUPPORT_EMAIL
  )}</a>.
        </p>
      `,
      ctaLabel: 'Retry Verification',
      ctaUrl: retryUrl,
    });

    return { subject, text, html };
  },

  orderConfirmation: (userName, orderId, orderDetails, grandTotal, vendorCount) => {
    const subject = `Order confirmation #${orderId} - ${BRAND_NAME}`;
    const trackUrl = `${FRONTEND_URL}/dashboard/customer`;

    const items = Array.isArray(orderDetails) ? orderDetails : [];

    const textLines = [
      `${BRAND_NAME} — Order confirmation`,
      '',
      `Hello ${userName},`,
      '',
      `Order Reference: #${orderId}`,
      vendorCount > 1 ? `Note: Your checkout includes items from ${vendorCount} vendors.` : '',
      '',
      'Order summary:',
      ...items.map((it) => {
        const name = it?.name ?? 'Item';
        const qty = toNumber(it?.quantity);
        const price = toNumber(it?.price);
        const line = qty * price;
        return `- ${name} — ${qty} × ${formatCurrency(price)} = ${formatCurrency(line)}`;
      }),
      '',
      `Grand total: ${formatCurrency(grandTotal)}`,
      `Track your order: ${trackUrl}`,
    ]
      .filter(Boolean)
      .join('\n');

    const rowsHtml = items
      .map((it) => {
        const name = escapeHtml(it?.name ?? 'Item');
        const qty = toNumber(it?.quantity);
        const price = toNumber(it?.price);
        const line = qty * price;
        return `
          <tr>
            <td style="padding:10px 8px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#111827;">
              ${name}
            </td>
            <td align="center" style="padding:10px 8px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#111827;">${qty}</td>
            <td align="right" style="padding:10px 8px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#111827;">${escapeHtml(
          formatCurrency(price)
        )}</td>
            <td align="right" style="padding:10px 8px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#111827;">${escapeHtml(
          formatCurrency(line)
        )}</td>
          </tr>
        `;
      })
      .join('');

    const html = renderCard({
      preheader: `Order #${orderId} confirmed.`,
      heading: 'Order confirmed',
      greeting: `Hello ${userName},`,
      lead: `Thanks for your purchase. Your order has been received and is being processed.`,
      bodyHtml: `
        <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">
          <strong>Order Reference:</strong> #${escapeHtml(orderId)}
        </p>
        ${vendorCount > 1
          ? `<p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6B7280;">Note: your checkout includes items from ${escapeHtml(
              String(vendorCount)
            )} vendors. Separate orders were created for each vendor.</p>`
          : ''}

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:12px 0 0 0;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr style="background:#F9FAFB;">
                  <th align="left" style="padding:10px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#6B7280;text-transform:uppercase;letter-spacing:0.6px;">Item</th>
                  <th align="center" style="padding:10px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#6B7280;text-transform:uppercase;letter-spacing:0.6px;">Qty</th>
                  <th align="right" style="padding:10px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#6B7280;text-transform:uppercase;letter-spacing:0.6px;">Unit</th>
                  <th align="right" style="padding:10px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#6B7280;text-transform:uppercase;letter-spacing:0.6px;">Total</th>
                </tr>
                ${rowsHtml}
                <tr>
                  <td colspan="3" align="right" style="padding:12px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#111827;"><strong>Grand total</strong></td>
                  <td align="right" style="padding:12px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#111827;"><strong>${escapeHtml(
                    formatCurrency(grandTotal)
                  )}</strong></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `,
      ctaLabel: 'Track your order',
      ctaUrl: trackUrl,
    });

    return { subject, text: textLines, html };
  },

  orderStatusUpdate: (userName, orderId, status, vendorName) => {
    const subject = `Order update #${orderId} - ${BRAND_NAME}`;
    const viewUrl = `${FRONTEND_URL}/dashboard/customer`;

    const rawStatus = String(status || 'Updated');
    const normalizedStatus = rawStatus.toLowerCase();

    const lifecycle = (() => {
      if (normalizedStatus === 'pending vendor action') {
        return {
          label: 'Pending Vendor Action',
          lead: 'Your order has been received and is waiting for vendor action.',
          nextStep: 'Your vendor will update the order status shortly.',
        };
      }

      if (normalizedStatus === 'accepted' || normalizedStatus === 'in progress') {
        return {
          label: 'Processing',
          lead: 'Your order is now being processed.',
          nextStep: 'We will notify you again once your order is shipped.',
        };
      }

      if (normalizedStatus === 'shipped') {
        return {
          label: 'Shipped',
          lead: 'Your order has been shipped and is on its way.',
          nextStep: 'Please keep an eye on your dashboard for delivery updates.',
        };
      }

      if (normalizedStatus === 'delivered' || normalizedStatus === 'completed') {
        return {
          label: 'Delivered',
          lead: 'Your order has been delivered.',
          nextStep: 'Thank you for shopping with us.',
        };
      }

      if (normalizedStatus === 'cancelled' || normalizedStatus === 'rejected') {
        return {
          label: 'Cancelled',
          lead: 'Your order has been cancelled.',
          nextStep: 'If you have questions, please contact support.',
        };
      }

      return {
        label: rawStatus,
        lead: 'Your order status has been updated.',
        nextStep: 'Please check your dashboard for the latest details.',
      };
    })();

    const text = [
      `${BRAND_NAME} — Order status update`,
      '',
      `Hello ${userName},`,
      '',
      `Order ID: #${orderId}`,
      `Vendor: ${vendorName}`,
      `Status: ${lifecycle.label}`,
      lifecycle.nextStep,
      '',
      `View details: ${viewUrl}`,
    ].join('\n');

    const html = renderCard({
      preheader: `Order #${orderId} status: ${lifecycle.label}.`,
      heading: 'Order status update',
      greeting: `Hello ${userName},`,
      lead: lifecycle.lead,
      bodyHtml: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #E5E7EB;border-radius:14px;">
          <tr>
            <td style="padding:14px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">
              <div><strong>Order ID:</strong> #${escapeHtml(orderId)}</div>
              <div style="margin-top:6px;"><strong>Vendor:</strong> ${escapeHtml(vendorName)}</div>
              <div style="margin-top:10px;">
                <span style="display:inline-block;padding:8px 12px;border-radius:999px;background:#F3F4F6;color:#111827;font-weight:700;font-size:13px;">
                  ${escapeHtml(lifecycle.label)}
                </span>
              </div>
              <p style="margin:10px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6B7280;">
                ${escapeHtml(lifecycle.nextStep)}
              </p>
            </td>
          </tr>
        </table>
      `,
      ctaLabel: 'View order details',
      ctaUrl: viewUrl,
    });

    return { subject, text, html };
  },

  twoFactorSetup: (userName, qrCodeDataUrl, manualKey) => {
    const subject = `Two-factor authentication setup - ${BRAND_NAME}`;
    const safeKey = String(manualKey || '').trim();

    const text = [
      `${BRAND_NAME} — 2FA setup`,
      '',
      `Hello ${userName},`,
      '',
      'To enable 2FA:',
      '1) Open your authenticator app',
      '2) Add a new account and scan the QR code (see email HTML)',
      safeKey ? `3) Or enter this setup key manually: ${safeKey}` : '3) Or enter the setup key manually (if provided)',
      '',
      'If you did not request this, contact support immediately.',
    ].join('\n');

    const html = renderCard({
      preheader: 'Scan the QR code or enter the setup key to enable 2FA.',
      heading: 'Two-factor authentication',
      greeting: `Hello ${userName},`,
      lead: 'Use the QR code below to add your account to an authenticator app. If images are blocked, use the setup key instead.',
      bodyHtml: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0 0 0;border:1px solid #E5E7EB;border-radius:14px;">
          <tr>
            <td align="center" style="padding:16px 14px;">
              <img src="${escapeAttr(qrCodeDataUrl)}" alt="2FA QR code" width="220" style="display:block;border:0;outline:none;text-decoration:none;border-radius:12px;max-width:220px;height:auto;" />
            </td>
          </tr>
        </table>

        ${safeKey
          ? `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:14px 0 0 0;border:1px solid #E5E7EB;border-radius:14px;">
            <tr>
              <td style="padding:14px 14px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:8px;">Setup key (manual)</div>
                <div style="font-family:Courier New,Courier,monospace;font-size:14px;line-height:20px;color:#111827;word-break:break-all;">${escapeHtml(
                  safeKey
                )}</div>
              </td>
            </tr>
          </table>
        `
          : ''}

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:14px 0 0 0;border:1px solid #DBEAFE;background:#EFF6FF;border-radius:14px;">
          <tr>
            <td style="padding:14px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#1E3A8A;">
              <strong>Security note</strong><br />
              Never share your 2FA codes or setup key. If you did not initiate this request, contact support.
            </td>
          </tr>
        </table>
      `,
    });

    return { subject, text, html };
  },

  vendorProductApproved: (vendorName, productName, productId) => {
    const subject = 'Your Product is Now Live on the Platform';
    const dashboardUrl = `${FRONTEND_URL}/dashboard/vendor/products`;
    const productRef = productId ? `#${String(productId).slice(-8).toUpperCase()}` : 'N/A';

    const text = [
      `${BRAND_NAME} — Product approved`,
      '',
      `Hello ${vendorName},`,
      '',
      `Your product "${productName}" is now approved and live.`,
      `Product Ref: ${productRef}`,
      'You can now manage this listing from your vendor dashboard.',
      '',
      `Open dashboard: ${dashboardUrl}`,
    ].join('\n');

    const html = renderCard({
      preheader: 'Your product is now live on the marketplace.',
      heading: 'Product approved',
      greeting: `Hello ${vendorName},`,
      lead: 'Good news. Your product has been reviewed and is now live on the platform.',
      bodyHtml: `
        <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">
          <strong>Product:</strong> ${escapeHtml(productName)}
        </p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6B7280;">
          <strong>Reference:</strong> ${escapeHtml(productRef)}
        </p>
      `,
      ctaLabel: 'Open Vendor Dashboard',
      ctaUrl: dashboardUrl,
      footerNote: 'Keep your listing updated to improve buyer engagement.',
    });

    return { subject, text, html };
  },

  vendorNewOrder: (vendorName, orderNumber, items, totalAmount) => {
    const subject = `New order received #${orderNumber} - ${BRAND_NAME}`;
    const dashboardUrl = `${FRONTEND_URL}/dashboard/vendor/orders`;
    const safeItems = Array.isArray(items) ? items : [];

    const itemLines = safeItems.map((item) => {
      const name = item?.name || 'Item';
      const quantity = toNumber(item?.quantity);
      return `- ${name} × ${quantity}`;
    });

    const text = [
      `${BRAND_NAME} — New order notification`,
      '',
      `Hello ${vendorName},`,
      '',
      'You have received a new order on your product listings.',
      `Order ID: #${orderNumber}`,
      ...itemLines,
      '',
      `Order total: ${formatCurrency(totalAmount)}`,
      `Review order: ${dashboardUrl}`,
    ].join('\n');

    const rowsHtml = safeItems
      .map((item) => {
        const name = escapeHtml(item?.name || 'Item');
        const quantity = toNumber(item?.quantity);
        return `
          <tr>
            <td style="padding:10px 8px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#111827;">${name}</td>
            <td align="right" style="padding:10px 8px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#111827;">${quantity}</td>
          </tr>
        `;
      })
      .join('');

    const html = renderCard({
      preheader: `New order #${orderNumber} received.`,
      heading: 'New order received',
      greeting: `Hello ${vendorName},`,
      lead: 'A customer has placed a new order that includes your product(s).',
      bodyHtml: `
        <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">
          <strong>Order ID:</strong> #${escapeHtml(orderNumber)}
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:12px 0 0 0;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;">
          <tr style="background:#F9FAFB;">
            <th align="left" style="padding:10px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#6B7280;text-transform:uppercase;">Product</th>
            <th align="right" style="padding:10px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#6B7280;text-transform:uppercase;">Qty</th>
          </tr>
          ${rowsHtml}
        </table>
        <p style="margin:12px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">
          <strong>Order total:</strong> ${escapeHtml(formatCurrency(totalAmount))}
        </p>
      `,
      ctaLabel: 'Review Order',
      ctaUrl: dashboardUrl,
      footerNote: 'Please review and process this order promptly.',
    });

    return { subject, text, html };
  },

  vendorProductRejected: (vendorName, productName, productId, rejectionReason) => {
    const subject = 'Product Review Result - Not Approved';
    const dashboardUrl = `${FRONTEND_URL}/dashboard/vendor/products`;
    const productRef = productId ? `#${String(productId).slice(-8).toUpperCase()}` : 'N/A';
    const reasonText = rejectionReason || 'No specific reason provided';

    const text = [
      `${BRAND_NAME} — Product review result`,
      '',
      `Hello ${vendorName},`,
      '',
      `Your product "${productName}" has been reviewed and was not approved at this time.`,
      `Product Ref: ${productRef}`,
      '',
      `Reason: ${reasonText}`,
      '',
      'You can review the feedback and make improvements before resubmitting.',
      `Resubmit: ${dashboardUrl}`,
    ].join('\n');

    const html = renderCard({
      preheader: 'Your product review result is ready.',
      heading: 'Product review: Not approved',
      greeting: `Hello ${vendorName},`,
      lead: 'Your product has been reviewed by our team. Unfortunately, it does not meet our current requirements.',
      bodyHtml: `
        <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">
          <strong>Product:</strong> ${escapeHtml(productName)}
        </p>
        <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6B7280;">
          <strong>Reference:</strong> ${escapeHtml(productRef)}
        </p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">
          <strong>Feedback:</strong>
        </p>
        <p style="margin:8px 0 0 0;padding:12px;background:#FEF2F2;border-left:4px solid #DC2626;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#7F1D1D;">
          ${escapeHtml(reasonText)}
        </p>
      `,
      ctaLabel: 'Review Requirements',
      ctaUrl: dashboardUrl,
      footerNote: 'You can make adjustments and resubmit your product at any time.',
    });

    return { subject, text, html };
  },

  vendorProductDeleted: (vendorName, productName, productId) => {
    const subject = 'Product Removed - Action by Administrator';
    const dashboardUrl = `${FRONTEND_URL}/dashboard/vendor/products`;
    const productRef = productId ? `#${String(productId).slice(-8).toUpperCase()}` : 'N/A';

    const text = [
      `${BRAND_NAME} — Product removal notification`,
      '',
      `Hello ${vendorName},`,
      '',
      `Your product "${productName}" has been removed from the platform.`,
      `Product Ref: ${productRef}`,
      '',
      'This product is no longer listed and is not visible to customers.',
      '',
      'If you believe this was done in error, please contact our support team.',
      `Dashboard: ${dashboardUrl}`,
    ].join('\n');

    const html = renderCard({
      preheader: 'Your product has been removed.',
      heading: 'Product removed',
      greeting: `Hello ${vendorName},`,
      lead: 'We wanted to inform you that one of your products has been removed from the platform.',
      bodyHtml: `
        <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">
          <strong>Product:</strong> ${escapeHtml(productName)}
        </p>
        <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6B7280;">
          <strong>Reference:</strong> ${escapeHtml(productRef)}
        </p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">
          This product is no longer visible to customers and cannot be purchased.
        </p>
      `,
      ctaLabel: 'View Dashboard',
      ctaUrl: dashboardUrl,
      footerNote: 'Contact support if you have questions regarding this removal.',
    });

    return { subject, text, html };
  },
};

// Send specific email types
const sendWelcomeEmail = async (to, userName, userRole) => {
  const emailContent = templates.welcome(userName, userRole);
  return await sendEmail({ to, ...emailContent });
};

const sendPasswordResetEmail = async (to, userName, resetToken, resetUrl) => {
  const emailContent = templates.passwordReset(userName, resetToken, resetUrl);
  return await sendEmail({ to, ...emailContent });
};

const sendOrderConfirmationEmail = async (to, userName, orderId, orderDetails, grandTotal, vendorCount) => {
  const emailContent = templates.orderConfirmation(userName, orderId, orderDetails, grandTotal, vendorCount);
  return await sendEmail({ to, ...emailContent });
};

const sendOrderStatusUpdateEmail = async (to, userName, orderId, status, vendorName) => {
  const emailContent = templates.orderStatusUpdate(userName, orderId, status, vendorName);
  return await sendEmail({ to, ...emailContent });
};

const sendTwoFactorSetupEmail = async (to, userName, qrCodeDataUrl, manualKey) => {
  const emailContent = templates.twoFactorSetup(userName, qrCodeDataUrl, manualKey);
  return await sendEmail({ to, ...emailContent });
};

const sendEmailVerificationOTP = async (to, userName, otp) => {
  const emailContent = templates.emailVerification(userName, otp);
  return await sendEmail({ to, ...emailContent });
};

const sendPasswordChangeNotification = async (to, userName) => {
  const emailContent = templates.passwordChangeNotification(userName);
  return await sendEmail({ to, ...emailContent });
};

const sendVendorRegistrationAcknowledgment = async (to, vendorName, businessName) => {
  const emailContent = templates.vendorRegistrationAcknowledgment(vendorName, businessName);
  return await sendEmail({ to, ...emailContent });
};

const sendVendorDecisionEmail = async (to, vendorName, isApproved, rejectionReason = '') => {
  const emailContent = templates.vendorDecision(vendorName, isApproved, rejectionReason);
  return await sendEmail({ to, ...emailContent });
};

const sendVendorVerificationApproved = async (to, vendorName, businessName) => {
  const emailContent = templates.vendorVerificationApproved(vendorName, businessName);
  return await sendEmail({ to, ...emailContent });
};

const sendVendorVerificationFailed = async (to, vendorName, reason) => {
  const emailContent = templates.vendorVerificationFailed(vendorName, reason);
  return await sendEmail({ to, ...emailContent });
};

const sendVendorProductApprovedEmail = async (to, vendorName, productName, productId) => {
  const emailContent = templates.vendorProductApproved(vendorName, productName, productId);
  return await sendEmail({ to, ...emailContent });
};

const sendVendorNewOrderEmail = async (to, vendorName, orderNumber, items, totalAmount) => {
  const emailContent = templates.vendorNewOrder(vendorName, orderNumber, items, totalAmount);
  return await sendEmail({ to, ...emailContent });
};

const sendVendorProductRejectedEmail = async (to, vendorName, productName, productId, rejectionReason) => {
  const emailContent = templates.vendorProductRejected(vendorName, productName, productId, rejectionReason);
  return await sendEmail({ to, ...emailContent });
};

const sendVendorProductDeletedEmail = async (to, vendorName, productName, productId) => {
  const emailContent = templates.vendorProductDeleted(vendorName, productName, productId);
  return await sendEmail({ to, ...emailContent });
};

module.exports = {
  sendEmail,
  verifyConnection,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendTwoFactorSetupEmail,
  sendEmailVerificationOTP,
  sendPasswordChangeNotification,
  sendVendorRegistrationAcknowledgment,
  sendVendorDecisionEmail,
  sendVendorVerificationApproved,
  sendVendorVerificationFailed,
  sendVendorProductApprovedEmail,
  sendVendorNewOrderEmail,
  sendVendorProductRejectedEmail,
  sendVendorProductDeletedEmail,
};
