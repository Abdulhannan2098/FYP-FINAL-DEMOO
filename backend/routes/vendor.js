const express = require('express');
const router = express.Router();
const {
  registerVendor,
  verifyVendorEmail,
  verifyPhone,
  resendPhoneOTP,
  getVerificationStatus,
  uploadCNIC,
  processVerification,
  retryVerification,
  uploadVerificationDocs,
  // Pre-registration OTP functions
  sendPreRegEmailOTP,
  sendPreRegPhoneOTP,
  verifyPreRegEmailOTP,
  verifyPreRegPhoneOTP,
  checkPreRegVerification,
} = require('../controllers/vendorController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
// Rate limiters removed for testing
// const { authLimiter, verifyOtpLimiter, forgotPasswordLimiter } = require('../middlewares/rateLimiter');
const { body } = require('express-validator');

// Vendor registration validation
const vendorRegistrationValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^(\+92|0)?3[0-9]{9}$/).withMessage('Please provide a valid Pakistani phone number'),
  body('businessName')
    .trim()
    .notEmpty().withMessage('Business name is required')
    .isLength({ max: 100 }).withMessage('Business name cannot exceed 100 characters'),
  body('businessAddress.city')
    .trim()
    .notEmpty().withMessage('Business city is required'),
  body('accessoryCategory')
    .notEmpty().withMessage('Accessory category is required')
    .isIn(['Interior', 'Exterior', 'Performance', 'Lighting', 'Audio & Electronics', 'Safety & Security', 'Wheels & Tires', 'Body Parts', 'Engine Parts', 'Maintenance & Care', 'Multiple Categories', 'Other'])
    .withMessage('Invalid accessory category'),
];

// Pre-registration OTP routes (no auth required)
// Rate limiters removed for testing
router.post('/pre-register/send-email-otp', sendPreRegEmailOTP);
router.post('/pre-register/send-phone-otp', sendPreRegPhoneOTP);
router.post('/pre-register/verify-email-otp', verifyPreRegEmailOTP);
router.post('/pre-register/verify-phone-otp', verifyPreRegPhoneOTP);
router.post('/pre-register/check-verification', checkPreRegVerification);

// Public routes (no auth required)
// Rate limiters removed for testing
router.post('/register', vendorRegistrationValidation, registerVendor);
router.post('/verify-email', verifyVendorEmail);
router.post('/verify-phone', verifyPhone);
router.post('/resend-phone-otp', resendPhoneOTP);

// Protected routes (vendor only)
router.get(
  '/verification-status',
  protect,
  authorize('vendor'),
  getVerificationStatus
);

router.post(
  '/verification/cnic',
  protect,
  authorize('vendor'),
  uploadVerificationDocs.fields([
    { name: 'cnicFront', maxCount: 1 },
    { name: 'cnicBack', maxCount: 1 },
  ]),
  uploadCNIC
);

router.post(
  '/verification/process',
  protect,
  authorize('vendor'),
  processVerification
);

router.post(
  '/verification/retry',
  protect,
  authorize('vendor'),
  retryVerification
);

module.exports = router;
