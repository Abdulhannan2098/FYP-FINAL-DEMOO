const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { validationResult } = require('express-validator');
const User = require('../models/user');
const Session = require('../models/Session');
const { JWT_SECRET, JWT_EXPIRE } = require('../config/env');
const {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendTwoFactorSetupEmail,
  sendEmailVerificationOTP,
  sendPasswordChangeNotification,
  sendVendorRegistrationAcknowledgment,
} = require('../utils/emailService');
const { extractSessionInfo } = require('../utils/sessionHelper');

// Configure multer for profile image uploads
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profiles';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const profileImageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, WEBP) are allowed!'));
  }
};

exports.uploadProfileImage = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for profile images
  fileFilter: profileImageFilter
});

const normalizeEmail = (value) => {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized.includes('@')) return normalized;

  const [localRaw, domainRaw] = normalized.split('@');
  const domain = domainRaw || '';

  // Gmail treats dots as insignificant and ignores +tags.
  // Canonicalize to prevent reset/login mismatches like maddi.9@gmail.com vs maddi9@gmail.com.
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const localNoTag = localRaw.split('+')[0];
    const localCanonical = localNoTag.replace(/\./g, '');
    return `${localCanonical}@gmail.com`;
  }

  return normalized;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const TEST_VENDOR_BYPASS_EMAIL = 'abdulhannan05455@gmail.com';

const isVendorBypassEmail = (email) => normalizeEmail(email) === TEST_VENDOR_BYPASS_EMAIL;

const getEffectiveVendorVerification = (user) => {
  const isBypassVendor = user?.role === 'vendor' && isVendorBypassEmail(user?.email);

  if (isBypassVendor) {
    return {
      vendorStatus: 'verified',
      emailVerified: true,
      phoneVerified: true,
    };
  }

  return {
    vendorStatus: user?.vendorStatus,
    emailVerified: !!user?.emailVerified,
    phoneVerified: !!user?.phoneVerified,
  };
};

const buildLooseEmailMatch = (normalizedEmail) => {
  // Handles accidental leading/trailing spaces + casing differences in stored emails.
  // (Some existing users may have been saved without trimming.)
  const pattern = `^\\s*${escapeRegex(normalizedEmail)}\\s*$`;
  return { $regex: pattern, $options: 'i' };
};

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

const buildAuthUserResponse = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  emailVerified: !!user.emailVerified,
  phoneVerified: !!user.phoneVerified,
  phone: user.phone,
  address: user.address,
  profileImage: user.profileImage,
  avatar: user.avatar, // Google OAuth profile picture
  ...(user.role === 'vendor' ? getEffectiveVendorVerification(user) : {}),
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, role, phone, address, businessName } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: role || 'customer',
      phone,
      address,
      businessName: role === 'vendor' ? businessName : undefined,
      emailVerified: false, // Explicitly set to false
    });

    // Generate email verification OTP
    const verificationOTP = user.getEmailVerificationOTP();
    await user.save({ validateBeforeSave: false });

    // Log OTP to console in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('\n' + '='.repeat(80));
      console.log('📧 EMAIL VERIFICATION OTP (Development Mode)');
      console.log('='.repeat(80));
      console.log('Email:', normalizedEmail);
      console.log('User:', user.name);
      console.log('OTP:', verificationOTP);
      console.log('Expires:', new Date(user.emailVerificationExpire).toLocaleString());
      console.log('='.repeat(80) + '\n');
    }

    // Send email verification OTP (blocking - registration should fail if email cannot be sent)
    try {
      const emailResult = await sendEmailVerificationOTP(user.email, user.name, verificationOTP);

      if (!emailResult?.success) {
        // Delete the user if email cannot be sent
        await User.findByIdAndDelete(user._id);
        throw new Error(emailResult?.error || 'Email delivery failed');
      }
    } catch (emailError) {
      // Delete the user if email sending fails
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({
        success: false,
        message: 'Registration failed. Unable to send verification email. Please try again.',
      });
    }

    // For vendors, also send registration acknowledgment email (non-blocking)
    if (role === 'vendor') {
      sendVendorRegistrationAcknowledgment(user.email, user.name, businessName).catch(err =>
        console.error('Failed to send vendor registration acknowledgment:', err.message)
      );
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email with the OTP sent to your inbox.',
      data: {
        email: user.email,
        requiresVerification: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if email is verified (only for customers with local auth)
    if (!user.emailVerified && user.authProvider === 'local' && user.role === 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in',
        code: 'EMAIL_NOT_VERIFIED',
        data: {
          email: user.email,
          role: user.role,
          requiresVerification: true,
        },
      });
    }

    // Vendor verification: require both email and phone verification
    if (user.role === 'vendor' && user.authProvider === 'local') {
      // Targeted testing bypass for a single vendor account.
      const headerValue = req.headers?.['x-mobile-test-login'];
      const isMobileSeedTestLogin =
        (headerValue === 'true' || headerValue === true || headerValue === '1') &&
        normalizedEmail === 'ali.hammad@autosphere.pk';
      const isBypassVendorLogin = isVendorBypassEmail(normalizedEmail) || isMobileSeedTestLogin;

      if (isBypassVendorLogin) {
        // Skip vendor verification checks for testing
      } else {
      if (!user.emailVerified) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email before logging in',
          code: 'EMAIL_NOT_VERIFIED',
          data: {
            email: user.email,
            role: user.role,
            requiresVerification: true,
            isVendor: true,
          },
        });
      }

      if (!user.phoneVerified) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your phone number before logging in',
          code: 'PHONE_NOT_VERIFIED',
          data: {
            email: user.email,
            phone: user.phone,
            role: user.role,
            requiresPhoneVerification: true,
            isVendor: true,
          },
        });
      }
      }
    }

    const token = generateToken(user._id);

    // Extract session information from request
    const sessionInfo = await extractSessionInfo(req);

    // Calculate token expiration (7 days default)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create session
    await Session.create({
      user: user._id,
      token,
      deviceInfo: sessionInfo.deviceInfo,
      location: sessionInfo.location,
      expiresAt,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      data: {
        user: buildAuthUserResponse(user),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Build response data based on user role
    const responseData = {
      ...buildAuthUserResponse(user),
      twoFactorEnabled: user.twoFactorEnabled,
    };

    // Include vendor-specific fields in response
    if (user.role === 'vendor') {
      const effectiveVendorVerification = getEffectiveVendorVerification(user);
      responseData.businessName = user.businessName;
      responseData.businessAddress = user.businessAddress;
      responseData.vendorStatus = effectiveVendorVerification.vendorStatus;
      responseData.phoneVerified = effectiveVendorVerification.phoneVerified;
      responseData.emailVerified = effectiveVendorVerification.emailVerified;
      responseData.accessoryCategory = user.accessoryCategory;
      responseData.cnicNumber = user.cnicNumber || null;
    }

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    const genericResponse = {
      success: true,
      message: 'If that email exists, a password reset code has been sent',
    };

    const user =
      (await User.findOne({ email: normalizedEmail })) ||
      (await User.findOne({ email: buildLooseEmailMatch(normalizedEmail) }));
    if (!user) {
      // Don't reveal if user exists or not
      return res.status(200).json(genericResponse);
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL (match frontend flow: Forgot Password -> Verify OTP -> Reset Password)
    // We intentionally do NOT include the OTP in the URL.
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-otp?email=${encodeURIComponent(
      user.email
    )}`;

    // Log OTP to console in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('\n' + '='.repeat(80));
      console.log('🔑 PASSWORD RESET OTP (Development Mode)');
      console.log('='.repeat(80));
      console.log('Email:', normalizedEmail);
      console.log('User:', user.name);
      console.log('OTP:', resetToken);
      console.log('Expires:', new Date(user.resetPasswordExpire).toLocaleString());
      console.log('='.repeat(80) + '\n');
    }

    // Send email
    try {
      const result = await sendPasswordResetEmail(user.email, user.name, resetToken, resetUrl);

      if (!result?.success) {
        throw new Error(result?.error || 'Email delivery failed');
      }

      res.status(200).json(genericResponse);
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Password reset code could not be sent. Please try again.',
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP',
      });
    }

    // Hash the OTP
    const hashedOTP = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');

    const user = await User.findOne({
      $and: [
        {
          $or: [
            { email: normalizedEmail },
            { email: buildLooseEmailMatch(normalizedEmail) },
          ],
        },
        { resetPasswordToken: hashedOTP },
        { resetPasswordExpire: { $gt: Date.now() } },
      ],
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // OTP is valid
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    // Hash the token from params
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const token = generateToken(user._id);

    // Send password change notification (non-blocking)
    sendPasswordChangeNotification(user.email, user.name).catch(err =>
      console.error('Failed to send password change notification:', err.message)
    );

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      data: { token },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP',
      });
    }

    // Hash the OTP
    const hashedOTP = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');

    const user = await User.findOne({
      $and: [
        {
          $or: [
            { email: normalizedEmail },
            { email: buildLooseEmailMatch(normalizedEmail) },
          ],
        },
        { emailVerificationOTP: hashedOTP },
        { emailVerificationExpire: { $gt: Date.now() } },
      ],
    }).select('+emailVerificationOTP +emailVerificationExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Mark email as verified and clear OTP fields
    user.emailVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    // Generate token for immediate login
    const token = generateToken(user._id);

    // Extract session information from request
    const sessionInfo = await extractSessionInfo(req);

    // Calculate token expiration (7 days default)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create session
    await Session.create({
      user: user._id,
      token,
      deviceInfo: sessionInfo.deviceInfo,
      location: sessionInfo.location,
      expiresAt,
      isActive: true,
      isTrusted: true, // First device is trusted
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name, user.role).catch(err =>
      console.error('Failed to send welcome email:', err.message)
    );

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: buildAuthUserResponse(user),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend email verification OTP
// @route   POST /api/auth/resend-verification-otp
// @access  Public
exports.resendVerificationOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    // Generic response to prevent user enumeration
    const genericResponse = {
      success: true,
      message: 'If that email exists and is not yet verified, a new OTP has been sent',
    };

    const user =
      (await User.findOne({ email: normalizedEmail })) ||
      (await User.findOne({ email: buildLooseEmailMatch(normalizedEmail) }));

    if (!user) {
      // Don't reveal if user exists or not
      return res.status(200).json(genericResponse);
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified. Please login.',
      });
    }

    // Generate new verification OTP
    const verificationOTP = user.getEmailVerificationOTP();
    await user.save({ validateBeforeSave: false });

    // Log OTP to console in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('\n' + '='.repeat(80));
      console.log('📧 RESEND EMAIL VERIFICATION OTP (Development Mode)');
      console.log('='.repeat(80));
      console.log('Email:', normalizedEmail);
      console.log('User:', user.name);
      console.log('OTP:', verificationOTP);
      console.log('Expires:', new Date(user.emailVerificationExpire).toLocaleString());
      console.log('='.repeat(80) + '\n');
    }

    // Send email
    try {
      const result = await sendEmailVerificationOTP(user.email, user.name, verificationOTP);

      if (!result?.success) {
        throw new Error(result?.error || 'Email delivery failed');
      }

      res.status(200).json(genericResponse);
    } catch (error) {
      user.emailVerificationOTP = undefined;
      user.emailVerificationExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Verification OTP could not be sent. Please try again.',
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Setup 2FA
// @route   POST /api/auth/2fa/setup
// @access  Private
exports.setup2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is already enabled',
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `AutoSphere (${user.email})`,
      length: 32,
    });

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Save secret temporarily (not enabled until verified)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Send setup email (include manual setup key for clients that block images)
    sendTwoFactorSetupEmail(user.email, user.name, qrCodeDataUrl, secret.base32).catch(err =>
      console.error('Failed to send 2FA setup email:', err.message)
    );

    res.status(200).json({
      success: true,
      message: '2FA setup initiated',
      data: {
        secret: secret.base32,
        qrCode: qrCodeDataUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify and enable 2FA
// @route   POST /api/auth/2fa/verify
// @access  Private
exports.verify2FA = async (req, res, next) => {
  try {
    const { token } = req.body;

    const user = await User.findById(req.user.id).select('+twoFactorSecret');

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'Please setup 2FA first',
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA code',
      });
    }

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    user.twoFactorBackupCodes = backupCodes;
    await user.save();

    res.status(200).json({
      success: true,
      message: '2FA enabled successfully',
      data: {
        backupCodes,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Disable 2FA
// @route   POST /api/auth/2fa/disable
// @access  Private
exports.disable2FA = async (req, res, next) => {
  try {
    const { token } = req.body;

    const user = await User.findById(req.user.id).select('+twoFactorSecret +twoFactorBackupCodes');

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled',
      });
    }

    // Verify token or backup code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    const backupCodeValid = user.twoFactorBackupCodes?.includes(token);

    if (!verified && !backupCodeValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA code or backup code',
      });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: '2FA disabled successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth callback handler
// @route   GET /api/auth/google/callback
// @access  Public
exports.googleCallback = async (req, res, next) => {
  try {
    // User is authenticated by passport, available in req.user
    const user = req.user;

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=authentication_failed`);
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Extract session information
    const sessionInfo = await extractSessionInfo(req);

    // Calculate token expiration (7 days default)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create session
    await Session.create({
      user: user._id,
      token,
      deviceInfo: sessionInfo.deviceInfo,
      location: sessionInfo.location,
      expiresAt,
      isActive: true,
      isTrusted: true, // OAuth logins are trusted
    });

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=server_error`);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      // Clean up uploaded file if user not found
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Handle profile image upload
    if (req.file) {
      // Delete old profile image if it exists
      if (user.profileImage) {
        const oldImagePath = user.profileImage.startsWith('/')
          ? user.profileImage.substring(1)
          : user.profileImage;
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
          } catch (err) {
            console.error('Error deleting old profile image:', err);
          }
        }
      }
      // Store the new image path
      user.profileImage = '/' + req.file.path.replace(/\\/g, '/');
    }

    // Update other fields if provided (from form data or JSON body)
    const { name, phone, address, businessName, businessAddress } = req.body;

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address) {
      // Handle address - it might come as a string (from FormData) or object
      if (typeof address === 'string') {
        try {
          user.address = JSON.parse(address);
        } catch (e) {
          // If parsing fails, ignore the address update
          console.error('Failed to parse address:', e);
        }
      } else {
        user.address = address;
      }
    }

    // Handle vendor-specific fields
    if (user.role === 'vendor') {
      if (businessName !== undefined) user.businessName = businessName;
      if (businessAddress) {
        // Handle businessAddress - it might come as a string (from FormData) or object
        if (typeof businessAddress === 'string') {
          try {
            user.businessAddress = JSON.parse(businessAddress);
          } catch (e) {
            // If parsing fails, ignore the businessAddress update
            console.error('Failed to parse businessAddress:', e);
          }
        } else {
          user.businessAddress = businessAddress;
        }
      }
    }

    await user.save();

    // Build response data based on user role
    const responseData = {
      ...buildAuthUserResponse(user),
    };

    // Include vendor-specific fields in response
    if (user.role === 'vendor') {
      responseData.businessName = user.businessName;
      responseData.businessAddress = user.businessAddress;
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: responseData,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password',
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if current password matches
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Check if new password is different from current
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Send password change notification (non-blocking)
    sendPasswordChangeNotification(user.email, user.name).catch(err =>
      console.error('Failed to send password change notification:', err.message)
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message,
    });
  }
};
