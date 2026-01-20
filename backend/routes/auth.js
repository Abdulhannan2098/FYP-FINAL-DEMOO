const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const {
  register,
  login,
  getMe,
  forgotPassword,
  verifyOTP,
  resetPassword,
  verifyEmail,
  resendVerificationOTP,
  setup2FA,
  verify2FA,
  disable2FA,
  googleCallback,
  updateProfile,
  changePassword,
  uploadProfileImage,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { registerValidation, loginValidation } = require('../utils/validators');
const {
  authLimiter,
  forgotPasswordLimiter,
  verifyOtpLimiter,
  resetPasswordLimiter,
} = require('../middlewares/rateLimiter');

// Public routes
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/verify-email', verifyOtpLimiter, verifyEmail);
router.post('/resend-verification-otp', forgotPasswordLimiter, resendVerificationOTP);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/verify-otp', verifyOtpLimiter, verifyOTP);
router.put('/reset-password/:resetToken', resetPasswordLimiter, resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, uploadProfileImage.single('profileImage'), updateProfile);
router.put('/change-password', protect, changePassword);

// 2FA routes
router.post('/2fa/setup', protect, setup2FA);
router.post('/2fa/verify', protect, verify2FA);
router.post('/2fa/disable', protect, disable2FA);

// OAuth routes - Google
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'], 
  session: false,
  prompt: 'select_account'  // Always show account picker
}));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), googleCallback);

module.exports = router;