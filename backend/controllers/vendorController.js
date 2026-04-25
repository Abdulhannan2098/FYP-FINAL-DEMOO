const crypto = require('crypto');
const https = require('https');
const http = require('http');
const os = require('os');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadBuffer } = require('../utils/cloudinaryUpload');
const { validationResult } = require('express-validator');
const User = require('../models/user');
const Session = require('../models/Session');
const { JWT_SECRET, JWT_EXPIRE } = require('../config/env');
const jwt = require('jsonwebtoken');
const {
  sendEmailVerificationOTP,
  sendVendorRegistrationAcknowledgment,
  sendVendorVerificationApproved,
  sendVendorVerificationFailed,
} = require('../utils/emailService');
const { sendPhoneVerificationOTP, sendVerificationStatusSMS } = require('../services/smsService');
const { extractSessionInfo } = require('../utils/sessionHelper');

/**
 * Download a remote URL (Cloudinary CDN) to a local /tmp file for OCR processing.
 * Returns the local file path.
 */
const downloadToTmp = (url, filename) => {
  const destPath = path.join(os.tmpdir(), filename);
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https://') ? https : http;
    const file = fs.createWriteStream(destPath);
    protocol.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve(destPath)));
    }).on('error', (err) => {
      try { fs.unlinkSync(destPath); } catch (_) {}
      reject(err);
    });
  });
};

const verificationFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files (JPEG, JPG, PNG) are allowed'));
};

// Use memory storage — writing to disk ourselves avoids Windows file-lock errors
// (UV_EUNKNOWN / errno -4094) caused by deterministic filenames being held open
// by a previous failed attempt or AV scanning.
exports.uploadVerificationDocs = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: verificationFileFilter
});

// Helper function to normalize email (same as authController)
const normalizeEmail = (value) => {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized.includes('@')) return normalized;

  const [localRaw, domainRaw] = normalized.split('@');
  const domain = domainRaw || '';

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const localNoTag = localRaw.split('+')[0];
    const localCanonical = localNoTag.replace(/\./g, '');
    return `${localCanonical}@gmail.com`;
  }

  return normalized;
};

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

// Build user response object
const buildVendorResponse = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  cnicNumber: user.cnicNumber || null,  // raw 13-digit string; needed on verification screen
  businessName: user.businessName,
  businessAddress: user.businessAddress,
  accessoryCategory: user.accessoryCategory,
  vendorStatus: user.vendorStatus,
  emailVerified: user.emailVerified,
  phoneVerified: user.phoneVerified,
  profileImage: user.profileImage,
});

// ============================================================
// PRE-REGISTRATION OTP VERIFICATION (Before account creation)
// ============================================================

// In-memory store for pre-registration OTPs (expires after 10 minutes)
// In production, use Redis for distributed systems
const preRegOTPStore = new Map();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash OTP for secure storage
const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

// Clean up expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of preRegOTPStore.entries()) {
    if (data.expiresAt < now) {
      preRegOTPStore.delete(key);
    }
  }
}, 60000); // Clean every minute

// @desc    Send email OTP for pre-registration verification
// @route   POST /api/vendor/pre-register/send-email-otp
// @access  Public
exports.sendPreRegEmailOTP = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
        field: 'email',
      });
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered',
        field: 'email',
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    const storeKey = `email_${normalizedEmail}`;
    preRegOTPStore.set(storeKey, {
      otp: hashedOTP,
      expiresAt,
      verified: false,
      attempts: 0,
    });

    // Log OTP in development
    if (process.env.NODE_ENV === 'development') {
      console.log('\n' + '='.repeat(60));
      console.log('PRE-REGISTRATION EMAIL OTP (Development)');
      console.log('='.repeat(60));
      console.log('Email:', normalizedEmail);
      console.log('OTP:', otp);
      console.log('Expires:', new Date(expiresAt).toLocaleString());
      console.log('='.repeat(60) + '\n');
    }

    // Send OTP email
    try {
      await sendEmailVerificationOTP(normalizedEmail, name || 'Vendor', otp);
    } catch (emailError) {
      console.error('Failed to send email OTP:', emailError);
      // Continue anyway in development
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email address',
      data: { email: normalizedEmail },
    });
  } catch (error) {
    console.error('Send pre-reg email OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.',
    });
  }
};

// @desc    Send phone OTP for pre-registration verification
// @route   POST /api/vendor/pre-register/send-phone-otp
// @access  Public
exports.sendPreRegPhoneOTP = async (req, res) => {
  try {
    const { phone, name } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
        field: 'phone',
      });
    }

    // Normalize phone number
    let normalizedPhone = phone.replace(/\s/g, '');
    if (normalizedPhone.startsWith('+92')) {
      normalizedPhone = '0' + normalizedPhone.slice(3);
    }

    // Check if phone already exists
    const existingUser = await User.findOne({ phone: normalizedPhone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This phone number is already registered',
        field: 'phone',
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    const storeKey = `phone_${normalizedPhone}`;
    preRegOTPStore.set(storeKey, {
      otp: hashedOTP,
      expiresAt,
      verified: false,
      attempts: 0,
    });

    // Log OTP in development
    if (process.env.NODE_ENV === 'development') {
      console.log('\n' + '='.repeat(60));
      console.log('PRE-REGISTRATION PHONE OTP (Development)');
      console.log('='.repeat(60));
      console.log('Phone:', normalizedPhone);
      console.log('OTP:', otp);
      console.log('Expires:', new Date(expiresAt).toLocaleString());
      console.log('='.repeat(60) + '\n');
    }

    // Send SMS OTP
    try {
      await sendPhoneVerificationOTP(normalizedPhone, otp, name || 'Vendor');
    } catch (smsError) {
      console.error('Failed to send SMS OTP:', smsError);
      // Continue anyway in development
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent to your phone number',
      data: { phone: normalizedPhone },
    });
  } catch (error) {
    console.error('Send pre-reg phone OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.',
    });
  }
};

// @desc    Verify email OTP for pre-registration
// @route   POST /api/vendor/pre-register/verify-email-otp
// @access  Public
exports.verifyPreRegEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const storeKey = `email_${normalizedEmail}`;
    const storedData = preRegOTPStore.get(storeKey);

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Please request a new OTP.',
        field: 'emailOtp',
      });
    }

    // Check expiry
    if (storedData.expiresAt < Date.now()) {
      preRegOTPStore.delete(storeKey);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.',
        field: 'emailOtp',
      });
    }

    // Check attempts
    if (storedData.attempts >= 5) {
      preRegOTPStore.delete(storeKey);
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.',
        field: 'emailOtp',
      });
    }

    // Verify OTP
    const hashedInputOTP = hashOTP(otp);
    if (hashedInputOTP !== storedData.otp) {
      storedData.attempts += 1;
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${5 - storedData.attempts} attempts remaining.`,
        field: 'emailOtp',
      });
    }

    // Mark as verified
    storedData.verified = true;
    storedData.verifiedAt = Date.now();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: { email: normalizedEmail, verified: true },
    });
  } catch (error) {
    console.error('Verify pre-reg email OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.',
    });
  }
};

// @desc    Verify phone OTP for pre-registration
// @route   POST /api/vendor/pre-register/verify-phone-otp
// @access  Public
exports.verifyPreRegPhoneOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required',
      });
    }

    // Normalize phone
    let normalizedPhone = phone.replace(/\s/g, '');
    if (normalizedPhone.startsWith('+92')) {
      normalizedPhone = '0' + normalizedPhone.slice(3);
    }

    const storeKey = `phone_${normalizedPhone}`;
    const storedData = preRegOTPStore.get(storeKey);

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Please request a new OTP.',
        field: 'phoneOtp',
      });
    }

    // Check expiry
    if (storedData.expiresAt < Date.now()) {
      preRegOTPStore.delete(storeKey);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.',
        field: 'phoneOtp',
      });
    }

    // Check attempts
    if (storedData.attempts >= 5) {
      preRegOTPStore.delete(storeKey);
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.',
        field: 'phoneOtp',
      });
    }

    // Verify OTP
    const hashedInputOTP = hashOTP(otp);
    if (hashedInputOTP !== storedData.otp) {
      storedData.attempts += 1;
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${5 - storedData.attempts} attempts remaining.`,
        field: 'phoneOtp',
      });
    }

    // Mark as verified
    storedData.verified = true;
    storedData.verifiedAt = Date.now();

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully',
      data: { phone: normalizedPhone, verified: true },
    });
  } catch (error) {
    console.error('Verify pre-reg phone OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.',
    });
  }
};

// @desc    Check if both email and phone are verified for pre-registration
// @route   POST /api/vendor/pre-register/check-verification
// @access  Public
exports.checkPreRegVerification = async (req, res) => {
  try {
    const { email, phone } = req.body;

    const normalizedEmail = normalizeEmail(email);
    let normalizedPhone = phone.replace(/\s/g, '');
    if (normalizedPhone.startsWith('+92')) {
      normalizedPhone = '0' + normalizedPhone.slice(3);
    }

    const emailData = preRegOTPStore.get(`email_${normalizedEmail}`);
    const phoneData = preRegOTPStore.get(`phone_${normalizedPhone}`);

    const emailVerified = emailData?.verified === true;
    const phoneVerified = phoneData?.verified === true;

    res.status(200).json({
      success: true,
      data: {
        emailVerified,
        phoneVerified,
        bothVerified: emailVerified && phoneVerified,
      },
    });
  } catch (error) {
    console.error('Check pre-reg verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check verification status.',
    });
  }
};

// Export the OTP store checker for use in registration
exports.isPreRegVerified = (email, phone) => {
  const normalizedEmail = normalizeEmail(email);
  let normalizedPhone = phone.replace(/\s/g, '');
  if (normalizedPhone.startsWith('+92')) {
    normalizedPhone = '0' + normalizedPhone.slice(3);
  }

  const emailData = preRegOTPStore.get(`email_${normalizedEmail}`);
  const phoneData = preRegOTPStore.get(`phone_${normalizedPhone}`);

  return {
    emailVerified: emailData?.verified === true,
    phoneVerified: phoneData?.verified === true,
  };
};

// Clear pre-registration OTPs after successful registration
exports.clearPreRegOTPs = (email, phone) => {
  const normalizedEmail = normalizeEmail(email);
  let normalizedPhone = phone.replace(/\s/g, '');
  if (normalizedPhone.startsWith('+92')) {
    normalizedPhone = '0' + normalizedPhone.slice(3);
  }

  preRegOTPStore.delete(`email_${normalizedEmail}`);
  preRegOTPStore.delete(`phone_${normalizedPhone}`);
};

// ============================================================
// VENDOR REGISTRATION (After OTP verification)
// ============================================================

// @desc    Register a new vendor
// @route   POST /api/vendor/register
// @access  Public
exports.registerVendor = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      name,
      email,
      password,
      phone,
      cnicNumber,
      businessName,
      businessType,
      businessRegistrationNumber,
      yearsInBusiness,
      businessAddress,
      accessoryCategory,
      hasPhysicalStore,
    } = req.body;

    const normalizedEmail = normalizeEmail(email);

    // Check if user already exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Check if CNIC is already registered
    if (cnicNumber) {
      const cnicExists = await User.findOne({ cnicNumber: cnicNumber.replace(/-/g, '') });
      if (cnicExists) {
        return res.status(400).json({
          success: false,
          message: 'This CNIC is already registered with another account',
        });
      }
    }

    // Check if email was pre-verified during registration flow (phone verification is optional)
    const preRegStatus = exports.isPreRegVerified(email, phone);

    if (!preRegStatus.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email address before completing registration',
        code: 'VERIFICATION_REQUIRED',
        data: {
          emailVerified: preRegStatus.emailVerified,
          phoneVerified: preRegStatus.phoneVerified,
        },
      });
    }

    // Create vendor — phone stored but marked unverified (can be verified later)
    const vendor = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: 'vendor',
      phone,
      cnicNumber: cnicNumber ? cnicNumber.replace(/-/g, '') : undefined, // Store without dashes
      businessName,
      businessType,
      businessRegistrationNumber,
      yearsInBusiness,
      businessAddress,
      accessoryCategory,
      hasPhysicalStore: hasPhysicalStore || false,
      emailVerified: true,   // Pre-verified during registration
      phoneVerified: false,  // Stored but not verified; can be verified later
      vendorStatus: 'unverified', // Still needs CNIC/selfie verification
    });

    // Clear pre-registration OTPs
    exports.clearPreRegOTPs(email, phone);

    // Send vendor registration acknowledgment
    try {
      await sendVendorRegistrationAcknowledgment(vendor.email, vendor.name, vendor.businessName);
    } catch (emailError) {
      console.error('Failed to send vendor registration acknowledgment:', emailError);
    }

    // Generate JWT token for automatic login
    const token = generateToken(vendor._id);

    // Create session
    const sessionInfo = await extractSessionInfo(req);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await Session.create({
      user: vendor._id,
      token,
      deviceInfo: sessionInfo.deviceInfo,
      location: sessionInfo.location,
      expiresAt,
      isActive: true,
    });

    // Log successful registration
    if (process.env.NODE_ENV === 'development') {
      console.log('\n' + '='.repeat(80));
      console.log('VENDOR REGISTERED SUCCESSFULLY');
      console.log('='.repeat(80));
      console.log('Email:', normalizedEmail);
      console.log('Phone:', phone);
      console.log('Business:', vendor.businessName);
      console.log('Email Verified:', vendor.emailVerified);
      console.log('Phone Verified:', vendor.phoneVerified);
      console.log('Vendor Status:', vendor.vendorStatus);
      console.log('='.repeat(80) + '\n');
    }

    res.status(201).json({
      success: true,
      message: 'Vendor account created successfully!',
      token,
      user: buildVendorResponse(vendor),
      data: {
        email: vendor.email,
        vendorStatus: vendor.vendorStatus,
        nextStep: 'IDENTITY_VERIFICATION',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email for vendor (same as auth but sends phone OTP after)
// @route   POST /api/vendor/verify-email
// @access  Public
exports.verifyVendorEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

    const user = await User.findOne({
      email: normalizedEmail,
      emailVerificationOTP: hashedOTP,
      emailVerificationExpire: { $gt: Date.now() },
    }).select('+emailVerificationOTP +emailVerificationExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpire = undefined;

    // Generate phone verification OTP
    const phoneOTP = user.getPhoneVerificationOTP();
    await user.save({ validateBeforeSave: false });

    // Log phone OTP in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('\n' + '='.repeat(80));
      console.log('VENDOR PHONE VERIFICATION OTP (Development Mode)');
      console.log('='.repeat(80));
      console.log('Phone:', user.phone);
      console.log('Vendor:', user.name);
      console.log('OTP:', phoneOTP);
      console.log('Expires:', new Date(user.phoneVerificationExpire).toLocaleString());
      console.log('='.repeat(80) + '\n');
    }

    // Send phone OTP
    try {
      await sendPhoneVerificationOTP(user.phone, phoneOTP, user.name);
    } catch (smsError) {
      console.error('Failed to send phone OTP:', smsError);
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. Please verify your phone number.',
      data: {
        email: user.email,
        phone: user.phone,
        emailVerified: true,
        phoneVerified: false,
        nextStep: 'VERIFY_PHONE',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify phone number
// @route   POST /api/vendor/verify-phone
// @access  Public
exports.verifyPhone = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

    const user = await User.findOne({
      email: normalizedEmail,
      phoneVerificationOTP: hashedOTP,
      phoneVerificationExpire: { $gt: Date.now() },
    }).select('+phoneVerificationOTP +phoneVerificationExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Mark phone as verified
    user.phoneVerified = true;
    user.phoneVerificationOTP = undefined;
    user.phoneVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    // Generate JWT token and create session
    const token = generateToken(user._id);
    const sessionInfo = await extractSessionInfo(req);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

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
      message: 'Phone verified successfully. You can now access your vendor dashboard.',
      data: {
        user: buildVendorResponse(user),
        token,
        nextStep: 'DASHBOARD',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend phone verification OTP
// @route   POST /api/vendor/resend-phone-otp
// @access  Public
exports.resendPhoneOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail, role: 'vendor' });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (!user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first',
      });
    }

    if (user.phoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Phone is already verified',
      });
    }

    // Generate new phone OTP
    const phoneOTP = user.getPhoneVerificationOTP();
    await user.save({ validateBeforeSave: false });

    // Log OTP in development
    if (process.env.NODE_ENV === 'development') {
      console.log('\n' + '='.repeat(60));
      console.log('RESEND PHONE OTP (Development Mode)');
      console.log('='.repeat(60));
      console.log('Phone:', user.phone);
      console.log('OTP:', phoneOTP);
      console.log('='.repeat(60) + '\n');
    }

    // Send phone OTP
    try {
      await sendPhoneVerificationOTP(user.phone, phoneOTP, user.name);
    } catch (smsError) {
      console.error('Failed to resend phone OTP:', smsError);
    }

    res.status(200).json({
      success: true,
      message: 'Phone verification OTP sent successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vendor verification status
// @route   GET /api/vendor/verification-status
// @access  Private (Vendor)
exports.getVerificationStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || user.role !== 'vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const verification = user.vendorVerification || {};
    const maxAttempts = 100; // Increased for testing (was 3)
    const attemptsRemaining = maxAttempts - (verification.verificationAttempts || 0);

    // Check if can retry (24 hour cooldown after max attempts)
    let canRetry = attemptsRemaining > 0;
    if (!canRetry && verification.lastAttemptDate) {
      const hoursSinceLastAttempt = (Date.now() - new Date(verification.lastAttemptDate)) / (1000 * 60 * 60);
      canRetry = hoursSinceLastAttempt >= 24;
    }

    // Format the user's registered CNIC (stored without dashes) for display
    const formatCnicForDisplay = (raw) => {
      if (!raw || raw.length !== 13) return raw || null;
      return `${raw.slice(0, 5)}-${raw.slice(5, 12)}-${raw.slice(12)}`;
    };

    res.status(200).json({
      success: true,
      data: {
        vendorStatus: user.vendorStatus,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        // The vendor's own registered CNIC — always present, shown to the owner only
        registeredCnic: formatCnicForDisplay(user.cnicNumber),
        steps: {
          email: { completed: user.emailVerified, required: true },
          phone: { completed: user.phoneVerified, required: true },
          cnic: {
            completed: !!(verification.cnicFront && verification.cnicBack),
            required: true,
            front: !!verification.cnicFront,
            back: !!verification.cnicBack,
          },
        },
        verification: {
          cnicNumber: verification.cnicNumber ? `${verification.cnicNumber.slice(0, 5)}*****${verification.cnicNumber.slice(-1)}` : null,
          cnicName: verification.cnicName,
          nameMatchScore: verification.nameMatchScore,
          verificationDate: verification.verificationDate,
          rejectionReason: verification.rejectionReason,
        },
        canRetry,
        attemptsRemaining: Math.max(0, attemptsRemaining),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload CNIC images
// @route   POST /api/vendor/verification/cnic
// @access  Private (Vendor)
exports.uploadCNIC = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || user.role !== 'vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (user.vendorStatus === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Vendor is already verified',
      });
    }

    if (!req.files || !req.files.cnicFront || !req.files.cnicBack) {
      return res.status(400).json({
        success: false,
        message: 'Both CNIC front and back images are required',
      });
    }

    // Upload CNIC images to Cloudinary — no local filesystem writes needed.
    const [frontResult, backResult] = await Promise.all([
      uploadBuffer(req.files.cnicFront[0].buffer, {
        folder: 'autosphere/verification',
        resource_type: 'image',
      }),
      uploadBuffer(req.files.cnicBack[0].buffer, {
        folder: 'autosphere/verification',
        resource_type: 'image',
      }),
    ]);

    // Initialize vendorVerification if not exists
    if (!user.vendorVerification) {
      user.vendorVerification = {};
    }

    // Store Cloudinary CDN URLs
    user.vendorVerification.cnicFront = frontResult.secure_url;
    user.vendorVerification.cnicBack  = backResult.secure_url;
    user.vendorStatus = 'pending_verification';

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'CNIC images uploaded successfully',
      data: {
        cnicFront: true,
        cnicBack: true,
        nextStep: 'PROCESS_VERIFICATION',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process verification - Step-by-Step Implementation
// @route   POST /api/vendor/verification/process
// @access  Private (Vendor)
exports.processVerification = async (req, res, next) => {
  try {
    const verificationService = require('../services/verificationService');
    const user = await User.findById(req.user.id);

    if (!user || user.role !== 'vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (user.vendorStatus === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Vendor is already verified',
      });
    }

    const verification = user.vendorVerification || {};

    // Check if required documents are uploaded
    if (!verification.cnicFront || !verification.cnicBack) {
      return res.status(400).json({
        success: false,
        message: 'Please upload CNIC images first',
      });
    }

    // Check attempt limits
    const maxAttempts = 100;
    if (verification.verificationAttempts >= maxAttempts) {
      const hoursSinceLastAttempt = verification.lastAttemptDate
        ? (Date.now() - new Date(verification.lastAttemptDate)) / (1000 * 60 * 60)
        : 25;

      if (hoursSinceLastAttempt < 24) {
        return res.status(429).json({
          success: false,
          message: 'Maximum verification attempts reached. Please try again after 24 hours.',
        });
      }
      verification.verificationAttempts = 0;
    }

    // Increment attempt counter
    verification.verificationAttempts = (verification.verificationAttempts || 0) + 1;
    verification.lastAttemptDate = new Date();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[VERIFICATION] Processing attempt #${verification.verificationAttempts} for user: ${user._id}`);
    console.log(`${'='.repeat(60)}`);

    // Download CNIC front image to /tmp for Tesseract OCR (Cloudinary URLs are not local paths)
    let cnicFrontPath = verification.cnicFront;
    let tmpFileToCleanup = null;
    if (cnicFrontPath && /^https?:\/\//i.test(cnicFrontPath)) {
      const tmpFilename = `${user._id}-cnicFront-${Date.now()}.jpg`;
      cnicFrontPath = await downloadToTmp(cnicFrontPath, tmpFilename);
      tmpFileToCleanup = cnicFrontPath;
    }

    let result;
    try {
      result = await verificationService.runStepByStepVerification({
        cnicFrontPath,
        registeredCNIC: user.cnicNumber,
        registeredName: user.name,
      });
    } finally {
      // Clean up tmp file regardless of success/failure
      if (tmpFileToCleanup) {
        try { fs.unlinkSync(tmpFileToCleanup); } catch (_) {}
      }
    }

    // Store attempt in log
    if (!verification.attemptLog) verification.attemptLog = [];
    verification.attemptLog.push({
      timestamp: new Date(),
      attemptNumber: verification.verificationAttempts,
      result: result.overallStatus,
      steps: result.steps,
    });

    // Update user status based on result
    if (result.passed) {
      user.vendorStatus = 'verified';
      verification.verificationDate = new Date();
      verification.rejectionReason = undefined;
      verification.verifiedBy = 'automated_system';

      // Extract data from steps for storage
      const step1 = result.steps.find(s => s.step === 1);
      if (step1 && step1.data) {
        verification.extractedCnicNumber = step1.data.extractedCNIC;
        verification.extractedCnicName = step1.data.extractedName;
        verification.ocrConfidence = step1.data.ocrConfidence;
      }

      user.vendorVerification = verification;
      await user.save({ validateBeforeSave: false });

      // Send success notifications
      try {
        await sendVendorVerificationApproved(user.email, user.name, user.businessName);
        await sendVerificationStatusSMS(user.phone, 'approved', user.businessName);
      } catch (notificationError) {
        console.error('Failed to send verification success notification:', notificationError);
      }

      return res.status(200).json({
        success: true,
        data: {
          status: 'verified',
          overallStatus: result.overallStatus,
          stepsPassed: result.stepsPassed,
          stepsFailed: result.stepsFailed,
          totalSteps: result.totalSteps,
          steps: result.steps,
          message: 'Your identity has been verified successfully.',
          verificationDate: verification.verificationDate,
        },
      });
    } else {
      // Verification failed (one or more steps failed)
      user.vendorStatus = 'rejected';

      // Build rejection reason from all failed steps
      const failedSteps = result.steps.filter(s => s.status === 'failed');
      const failedStepNames = failedSteps.map(s => s.name).join(', ');
      verification.rejectionReason = `Failed steps: ${failedStepNames}`;

      user.vendorVerification = verification;
      await user.save({ validateBeforeSave: false });

      // Send failure notifications
      try {
        await sendVendorVerificationFailed(user.email, user.name, verification.rejectionReason);
        await sendVerificationStatusSMS(user.phone, 'rejected', user.businessName);
      } catch (notificationError) {
        console.error('Failed to send verification failure notification:', notificationError);
      }

      return res.status(200).json({
        success: true,
        data: {
          status: 'rejected',
          overallStatus: result.overallStatus,
          stepsPassed: result.stepsPassed,
          stepsFailed: result.stepsFailed,
          totalSteps: result.totalSteps,
          steps: result.steps,
          message: `Verification incomplete: ${result.stepsPassed}/${result.totalSteps} steps passed`,
          canRetry: verification.verificationAttempts < maxAttempts,
          attemptsRemaining: maxAttempts - verification.verificationAttempts,
        },
      });
    }
  } catch (error) {
    console.error('[VERIFICATION] Unexpected error:', error);
    next(error);
  }
};

// @desc    Retry verification (clear previous attempt)
// @route   POST /api/vendor/verification/retry
// @access  Private (Vendor)
exports.retryVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || user.role !== 'vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (user.vendorStatus === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Vendor is already verified',
      });
    }

    const verification = user.vendorVerification || {};

    // Check if can retry
    const maxAttempts = 100; // Increased for testing (was 3)
    if (verification.verificationAttempts >= maxAttempts) {
      const hoursSinceLastAttempt = verification.lastAttemptDate
        ? (Date.now() - new Date(verification.lastAttemptDate)) / (1000 * 60 * 60)
        : 25;

      if (hoursSinceLastAttempt < 24) {
        return res.status(429).json({
          success: false,
          message: 'Maximum verification attempts reached. Please try again after 24 hours.',
          data: {
            retryAfter: Math.ceil(24 - hoursSinceLastAttempt),
          },
        });
      }
      // Reset attempts after 24 hours
      verification.verificationAttempts = 0;
    }

    // Delete old verification files
    const filesToDelete = [
      verification.cnicFront,
      verification.cnicBack,
    ].filter(Boolean);

    for (const filePath of filesToDelete) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Failed to delete file:', filePath, err);
      }
    }

    // Reset verification data (keep attempt count)
    user.vendorVerification = {
      verificationAttempts: verification.verificationAttempts,
      lastAttemptDate: verification.lastAttemptDate,
    };
    user.vendorStatus = 'unverified';
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Verification reset. You can now upload new documents.',
      data: {
        attemptsRemaining: maxAttempts - (verification.verificationAttempts || 0),
      },
    });
  } catch (error) {
    next(error);
  }
};
