/**
 * Vendor Middleware
 * Provides middleware functions for vendor-specific access control
 */

const TEST_VENDOR_BYPASS_EMAIL = 'abdulhannan05455@gmail.com';

const isBypassVendor = (email) =>
  (email ?? '').toString().trim().toLowerCase() === TEST_VENDOR_BYPASS_EMAIL;

/**
 * Require verified vendor status
 * Use this middleware for routes that should only be accessible to verified vendors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireVerifiedVendor = (req, res, next) => {
  // Skip for non-vendors (let role middleware handle that)
  if (req.user.role !== 'vendor') {
    return next();
  }

  if (isBypassVendor(req.user?.email)) {
    return next();
  }

  // Mobile-only testing bypass: allow the seeded vendor to access vendor-only features
  // when the mobile app explicitly opts in via a header.
  const headerValue = req.headers?.['x-mobile-test-login'];
  const isMobileTestLogin =
    (headerValue === 'true' || headerValue === true || headerValue === '1') &&
    (req.user?.email ?? '').toString().trim().toLowerCase() === 'ali.hammad@autosphere.pk';

  if (isMobileTestLogin) {
    return next();
  }

  // Check if vendor is verified
  if (req.user.vendorStatus !== 'verified') {
    return res.status(403).json({
      success: false,
      code: 'VENDOR_NOT_VERIFIED',
      message: 'Your vendor account is not verified. Please complete the verification process to access this feature.',
      data: {
        vendorStatus: req.user.vendorStatus,
        action: 'COMPLETE_VERIFICATION'
      }
    });
  }

  next();
};

/**
 * Require email and phone verification
 * Use for routes that need basic verification (email + phone) but not full identity verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireBasicVerification = (req, res, next) => {
  // Skip for non-vendors
  if (req.user.role !== 'vendor') {
    return next();
  }

  if (isBypassVendor(req.user?.email)) {
    return next();
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Please verify your email to continue.',
      data: {
        action: 'VERIFY_EMAIL'
      }
    });
  }

  if (!req.user.phoneVerified) {
    return res.status(403).json({
      success: false,
      code: 'PHONE_NOT_VERIFIED',
      message: 'Please verify your phone number to continue.',
      data: {
        action: 'VERIFY_PHONE'
      }
    });
  }

  next();
};

/**
 * Check vendor status and attach verification info to request
 * Useful for routes that need to know vendor status but don't require verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const attachVendorStatus = (req, res, next) => {
  if (req.user.role === 'vendor') {
    const bypassVendor = isBypassVendor(req.user?.email);
    const effectiveVendorStatus = bypassVendor ? 'verified' : req.user.vendorStatus;

    req.vendorInfo = {
      isVerified: effectiveVendorStatus === 'verified',
      status: effectiveVendorStatus,
      emailVerified: bypassVendor ? true : req.user.emailVerified,
      phoneVerified: bypassVendor ? true : req.user.phoneVerified,
      canCreateProducts: effectiveVendorStatus === 'verified',
      canManageOrders: effectiveVendorStatus === 'verified',
      needsVerification: effectiveVendorStatus !== 'verified'
    };
  }
  next();
};

module.exports = {
  requireVerifiedVendor,
  requireBasicVerification,
  attachVendorStatus
};
