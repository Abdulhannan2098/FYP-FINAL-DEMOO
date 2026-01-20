const nodemailer = require('nodemailer');
require('dotenv').config();

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
      from: `"${process.env.EMAIL_FROM_NAME || 'AutoSphere'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@autosphere.com'}>`,
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
  // Email verification OTP
  emailVerification: (userName, otp) => ({
    subject: 'Verify Your Email - AutoSphere',
    text: `Hello ${userName},\n\nYour email verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't create an account, please ignore this email.\n`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7C2D12 0%, #991B1B 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: #ffffff; border: 3px solid #991B1B; padding: 25px; border-radius: 10px; text-align: center; margin: 30px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .otp-code { font-family: 'Courier New', monospace; font-size: 48px; font-weight: bold; color: #991B1B; letter-spacing: 12px; margin: 15px 0; }
          .otp-label { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; }
          .expire-time { background: #FEE2E2; color: #991B1B; padding: 10px; border-radius: 5px; text-align: center; font-weight: bold; margin: 20px 0; }
          .info-box { background: #DBEAFE; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Verify Your Email</h1>
          </div>
          <div class="content">
            <h2 style="color: #1E1E1E; margin-top: 0;">Hello ${userName}! 👋</h2>
            <p style="font-size: 16px;">Thank you for registering with AutoSphere. To complete your registration, please verify your email address using the code below.</p>

            <div class="otp-box">
              <div class="otp-label">Your Verification Code</div>
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Enter this code to verify your email</p>
            </div>

            <div class="expire-time">
              ⏰ This code will expire in 10 minutes
            </div>

            <div class="info-box">
              <strong>🔒 Security Note:</strong>
              <p style="margin: 10px 0 0 0;">If you didn't create an account with AutoSphere, please ignore this email. Someone may have entered your email address by mistake.</p>
            </div>

            <p style="text-align: center; color: #888; font-size: 13px; margin-top: 30px;">
              Having trouble? Contact our support team at support@autosphere.com
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AutoSphere. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Password change notification
  passwordChangeNotification: (userName) => ({
    subject: 'Password Changed Successfully - AutoSphere',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7C2D12 0%, #991B1B 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-badge { background: #10B981; color: white; padding: 15px 30px; border-radius: 30px; display: inline-block; font-weight: bold; margin: 20px 0; }
          .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 30px; background: #991B1B; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Changed</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <div style="text-align: center;">
              <span class="success-badge">✅ Password Successfully Changed</span>
            </div>
            <p>Your password for your AutoSphere account was successfully changed on ${new Date().toLocaleString()}.</p>

            <div class="warning">
              <strong>⚠️ Didn't make this change?</strong>
              <p style="margin: 10px 0 0 0;">If you didn't change your password, your account may have been compromised. Please take the following steps immediately:</p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Reset your password using the "Forgot Password" option</li>
                <li>Review your account activity</li>
                <li>Contact our support team</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/forgot-password" class="button">Reset Password</a>
            </div>

            <p style="text-align: center; color: #888; font-size: 13px;">
              If you made this change, no further action is required.
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AutoSphere. All rights reserved.</p>
            <p>This is an automated security notification.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Vendor registration acknowledgment
  vendorRegistrationAcknowledgment: (vendorName, businessName) => ({
    subject: 'Vendor Registration Received - AutoSphere',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7C2D12 0%, #991B1B 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .status-badge { background: #F59E0B; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; font-weight: bold; margin: 15px 0; }
          .info-box { background: #DBEAFE; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .steps { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .step { display: flex; align-items: center; margin: 15px 0; }
          .step-number { background: #991B1B; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏪 Vendor Registration Received</h1>
          </div>
          <div class="content">
            <h2>Hello ${vendorName}!</h2>
            <p>Thank you for your interest in becoming a vendor on AutoSphere!</p>

            ${businessName ? `<p><strong>Business Name:</strong> ${businessName}</p>` : ''}

            <div style="text-align: center;">
              <span class="status-badge">📋 Application Under Review</span>
            </div>

            <div class="info-box">
              <strong>📝 What happens next?</strong>
              <p style="margin: 10px 0 0 0;">Our team will review your application. This typically takes 1-2 business days. You'll receive an email notification once a decision has been made.</p>
            </div>

            <div class="steps">
              <h3 style="margin-top: 0;">While you wait, you can:</h3>
              <div class="step">
                <span class="step-number">1</span>
                <span>Complete your profile with business details</span>
              </div>
              <div class="step">
                <span class="step-number">2</span>
                <span>Prepare your product catalog and images</span>
              </div>
              <div class="step">
                <span class="step-number">3</span>
                <span>Review our vendor guidelines and policies</span>
              </div>
            </div>

            <p style="text-align: center; color: #888; font-size: 13px;">
              Questions? Contact us at vendor-support@autosphere.com
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AutoSphere. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Vendor approval/rejection notification
  vendorDecision: (vendorName, isApproved, rejectionReason = '') => ({
    subject: isApproved
      ? '🎉 Congratulations! Your Vendor Application is Approved - AutoSphere'
      : 'Vendor Application Update - AutoSphere',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${isApproved ? '#059669' : '#DC2626'} 0%, ${isApproved ? '#10B981' : '#EF4444'} 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .status-badge { background: ${isApproved ? '#10B981' : '#EF4444'}; color: white; padding: 15px 30px; border-radius: 30px; display: inline-block; font-weight: bold; font-size: 18px; margin: 20px 0; }
          .next-steps { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid ${isApproved ? '#10B981' : '#F59E0B'}; }
          .button { display: inline-block; padding: 12px 30px; background: #991B1B; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .rejection-reason { background: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isApproved ? '🎉 Application Approved!' : '📋 Application Update'}</h1>
          </div>
          <div class="content">
            <h2>Hello ${vendorName},</h2>

            <div style="text-align: center;">
              <span class="status-badge">${isApproved ? '✅ APPROVED' : '❌ NOT APPROVED'}</span>
            </div>

            ${isApproved ? `
              <p>We're excited to welcome you to the AutoSphere vendor community! Your application has been reviewed and approved.</p>

              <div class="next-steps">
                <h3 style="margin-top: 0; color: #059669;">🚀 Get Started Now:</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li><strong>Add Products:</strong> Start listing your automotive accessories</li>
                  <li><strong>Set Up Store:</strong> Customize your vendor profile</li>
                  <li><strong>Manage Orders:</strong> Track and fulfill customer orders</li>
                  <li><strong>Grow Your Business:</strong> Reach thousands of car enthusiasts</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/vendor" class="button">Go to Vendor Dashboard</a>
              </div>
            ` : `
              <p>Thank you for your interest in becoming a vendor on AutoSphere. After careful review, we regret to inform you that your application was not approved at this time.</p>

              ${rejectionReason ? `
                <div class="rejection-reason">
                  <strong>📝 Reason:</strong>
                  <p style="margin: 10px 0 0 0;">${rejectionReason}</p>
                </div>
              ` : ''}

              <div class="next-steps">
                <h3 style="margin-top: 0; color: #F59E0B;">What can you do?</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Review and update your business information</li>
                  <li>Ensure you meet all vendor requirements</li>
                  <li>Contact our support team for clarification</li>
                  <li>Reapply after addressing the concerns</li>
                </ul>
              </div>
            `}

            <p style="text-align: center; color: #888; font-size: 13px; margin-top: 30px;">
              Questions? Contact us at vendor-support@autosphere.com
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AutoSphere. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Welcome email
  welcome: (userName, userRole) => ({
    subject: 'Welcome to AutoSphere! 🚗',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7C2D12 0%, #991B1B 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #991B1B; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to AutoSphere!</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName}! 👋</h2>
            <p>Thank you for joining AutoSphere, your premier destination for high-quality automotive accessories and parts.</p>
            <p>Your account has been successfully created as a <strong>${userRole}</strong>.</p>
            ${userRole === 'vendor' ? `
              <p><strong>Next Steps for Vendors:</strong></p>
              <ul>
                <li>Add your products to the marketplace</li>
                <li>Set up your vendor profile</li>
                <li>Start receiving orders from customers</li>
              </ul>
            ` : userRole === 'customer' ? `
              <p><strong>Start Shopping:</strong></p>
              <ul>
                <li>Browse our extensive catalog of automotive products</li>
                <li>Add items to your cart from multiple vendors</li>
                <li>Enjoy secure checkout and fast delivery</li>
              </ul>
            ` : ''}
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">Go to Dashboard</a>
            </div>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Happy shopping! 🛒</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AutoSphere. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Password reset email
  passwordReset: (userName, resetToken, resetUrl) => ({
    subject: 'Your AutoSphere Password Reset Code',
    text: `AutoSphere Password Reset\n\nHello ${userName},\n\nYour password reset code is: ${resetToken}\n\nThis code expires in 10 minutes.\n\nIf you didn’t request this, you can ignore this message.\n\nReset link (optional): ${resetUrl}\n`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7C2D12 0%, #991B1B 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px; }
          .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .otp-box { background: #ffffff; border: 3px solid #991B1B; padding: 25px; border-radius: 10px; text-align: center; margin: 30px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .otp-code { font-family: 'Courier New', monospace; font-size: 48px; font-weight: bold; color: #991B1B; letter-spacing: 12px; margin: 15px 0; }
          .otp-label { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; }
          .expire-time { background: #FEE2E2; color: #991B1B; padding: 10px; border-radius: 5px; text-align: center; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2 style="color: #1E1E1E; margin-top: 0;">Hello ${userName},</h2>
            <p style="font-size: 16px;">We received a request to reset your password for your AutoSphere account.</p>

            <div class="otp-box">
              <div class="otp-label">Your Verification Code</div>
              <div class="otp-code">${resetToken}</div>
              <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Enter this code to reset your password</p>
            </div>

            <div class="expire-time">
              ⏰ This code will expire in 10 minutes
            </div>

            <div class="warning">
              <strong>⚠️ Security Tips:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Never share this code with anyone</li>
                <li>AutoSphere staff will never ask for this code</li>
                <li>If you didn't request this, ignore this email</li>
              </ul>
            </div>

            <p style="text-align: center; color: #888; font-size: 13px; margin-top: 30px;">
              Having trouble? Contact our support team at support@autosphere.com
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AutoSphere. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Order confirmation email
  orderConfirmation: (userName, orderId, orderDetails, grandTotal, vendorCount) => ({
    subject: `Order Confirmation #${orderId} - AutoSphere`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7C2D12 0%, #991B1B 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; }
          .order-item { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #991B1B; }
          .total { background: #1E1E1E; color: white; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #991B1B; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Order Confirmed!</h1>
          </div>
          <div class="content">
            <h2>Thank you for your order, ${userName}!</h2>
            <p>Your order has been received and is being processed.</p>
            <p><strong>Order ID:</strong> #${orderId}</p>
            ${vendorCount > 1 ? `<p><strong>Note:</strong> Your order contains items from ${vendorCount} vendors. Separate orders have been created for each vendor.</p>` : ''}
            <h3>Order Summary:</h3>
            ${orderDetails.map(item => `
              <div class="order-item">
                <strong>${item.name}</strong><br>
                Quantity: ${item.quantity} × $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}
              </div>
            `).join('')}
            <div class="total">
              <h2 style="margin: 0;">Grand Total: $${grandTotal.toFixed(2)}</h2>
            </div>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/customer" class="button">Track Your Order</a>
            </div>
            <p>We'll send you another email when your order ships.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AutoSphere. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Order status update email
  orderStatusUpdate: (userName, orderId, status, vendorName) => ({
    subject: `Order Status Update #${orderId} - AutoSphere`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7C2D12 0%, #991B1B 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .status-badge { display: inline-block; padding: 10px 20px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #991B1B; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Order Status Update</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>Your order status has been updated.</p>
            <p><strong>Order ID:</strong> #${orderId}</p>
            <p><strong>Vendor:</strong> ${vendorName}</p>
            <div style="text-align: center;">
              <span class="status-badge" style="background: ${status === 'Completed' ? '#10B981' : status === 'Shipped' ? '#3B82F6' : status === 'Rejected' ? '#EF4444' : '#F59E0B'}; color: white;">
                ${status}
              </span>
            </div>
            ${status === 'Shipped' ? '<p>🚚 Your order is on its way! You should receive it soon.</p>' : ''}
            ${status === 'Completed' ? '<p>✅ Your order has been completed. Thank you for shopping with AutoSphere!</p>' : ''}
            ${status === 'Rejected' ? '<p>❌ Unfortunately, your order was rejected by the vendor. Please contact support for more information.</p>' : ''}
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/customer" class="button">View Order Details</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AutoSphere. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // 2FA setup email
  twoFactorSetup: (userName, qrCodeDataUrl) => ({
    subject: 'Two-Factor Authentication Setup - AutoSphere',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7C2D12 0%, #991B1B 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .qr-code { text-align: center; margin: 30px 0; }
          .security-tip { background: #DBEAFE; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Enable Two-Factor Authentication</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>You've requested to enable Two-Factor Authentication (2FA) for your AutoSphere account.</p>
            <p><strong>Follow these steps:</strong></p>
            <ol>
              <li>Download an authenticator app (Google Authenticator, Authy, etc.)</li>
              <li>Scan the QR code below with your authenticator app</li>
              <li>Enter the 6-digit code from your app to complete setup</li>
            </ol>
            <div class="qr-code">
              <img src="${qrCodeDataUrl}" alt="2FA QR Code" style="max-width: 250px; border: 2px solid #ddd; padding: 10px; border-radius: 10px;" />
            </div>
            <div class="security-tip">
              <strong>🛡️ Security Tip:</strong>
              <p style="margin: 10px 0;">Keep your authenticator app secure and never share your 2FA codes with anyone.</p>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AutoSphere. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
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

const sendTwoFactorSetupEmail = async (to, userName, qrCodeDataUrl) => {
  const emailContent = templates.twoFactorSetup(userName, qrCodeDataUrl);
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
};
