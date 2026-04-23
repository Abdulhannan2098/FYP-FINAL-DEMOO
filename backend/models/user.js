const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: function() {
        // Password not required for OAuth users
        return !this.authProvider || this.authProvider === 'local';
      },
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    // OAuth fields
    authProvider: {
      type: String,
      enum: ['local', 'google', 'facebook', 'github'],
      default: 'local',
    },
    authProviderId: {
      type: String,
      sparse: true, // Allow multiple null values
    },
    avatar: {
      type: String, // Store profile picture URL from OAuth
    },
    profileImage: {
      type: String, // Store uploaded profile image path
    },
    emailVerified: {
      type: Boolean,
      default: false, // OAuth users are auto-verified
    },
    // Email verification OTP fields
    emailVerificationOTP: {
      type: String,
      select: false,
    },
    emailVerificationExpire: {
      type: Date,
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'vendor', 'admin'],
      default: 'customer',
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    // Vendor-specific fields
    businessName: {
      type: String,
      trim: true,
      maxlength: [100, 'Business name cannot exceed 100 characters'],
    },
    businessType: {
      type: String,
      enum: ['sole_proprietor', 'partnership', 'private_limited', 'retailer', 'wholesaler', 'manufacturer'],
    },
    businessRegistrationNumber: {
      type: String,
      trim: true,
    },
    yearsInBusiness: {
      type: String,
      enum: ['new', '1-3', '3-5', '5-10', '10+', ''],
    },
    hasPhysicalStore: {
      type: Boolean,
      default: false,
    },
    cnicNumber: {
      type: String,
      trim: true,
      sparse: true, // Allow multiple null values
    },
    businessAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    // Vendor verification status
    vendorStatus: {
      type: String,
      enum: ['unverified', 'pending_verification', 'verified', 'rejected'],
      default: 'unverified',
    },
    // Category of accessories sold by vendor
    accessoryCategory: {
      type: String,
      enum: ['Interior', 'Exterior', 'Performance', 'Lighting', 'Audio & Electronics', 'Safety & Security', 'Wheels & Tires', 'Body Parts', 'Engine Parts', 'Maintenance & Care', 'Multiple Categories', 'Other'],
    },
    // Phone verification fields
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerificationOTP: {
      type: String,
      select: false,
    },
    phoneVerificationExpire: {
      type: Date,
      select: false,
    },
    // Vendor verification documents and data
    vendorVerification: {
      cnicFront: String,
      cnicBack: String,
      cnicNumber: String,
      cnicName: String,
      nameMatchScore: Number,
      verificationDate: Date,
      rejectionReason: String,
      verificationAttempts: {
        type: Number,
        default: 0,
      },
      lastAttemptDate: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Password reset fields
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
    // Two-Factor Authentication fields
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    twoFactorBackupCodes: {
      type: [String],
      select: false,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Hash password before saving (skip for OAuth users)
userSchema.pre('save', async function (next) {
  // Skip password hashing for OAuth users
  if (!this.password || !this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate password reset OTP (6-digit)
userSchema.methods.getResetPasswordToken = function () {
  const crypto = require('crypto');

  // Generate 6-digit OTP
  const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash OTP and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire time (10 minutes for OTP)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Generate email verification OTP (6-digit)
userSchema.methods.getEmailVerificationOTP = function () {
  const crypto = require('crypto');

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash OTP and set to emailVerificationOTP field
  this.emailVerificationOTP = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  // Set expire time (10 minutes for OTP)
  this.emailVerificationExpire = Date.now() + 10 * 60 * 1000;

  return otp;
};

// Generate phone verification OTP (6-digit)
userSchema.methods.getPhoneVerificationOTP = function () {
  const crypto = require('crypto');

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash OTP and set to phoneVerificationOTP field
  this.phoneVerificationOTP = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  // Set expire time (10 minutes for OTP)
  this.phoneVerificationExpire = Date.now() + 10 * 60 * 1000;

  return otp;
};

module.exports = mongoose.model('User', userSchema);