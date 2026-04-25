import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Eye,
  EyeOff,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Tag,
  CreditCard,
  Briefcase,
  FileText,
  CheckCircle,
  Shield,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import api from '../services/api';

const ACCESSORY_CATEGORIES = [
  'Interior',
  'Exterior',
  'Performance',
  'Lighting',
  'Audio & Electronics',
  'Safety & Security',
  'Wheels & Tires',
  'Body Parts',
  'Engine Parts',
  'Maintenance & Care',
  'Multiple Categories',
];

const BUSINESS_TYPES = [
  { value: 'sole_proprietor', label: 'Sole Proprietorship', description: 'Individual owned business' },
  { value: 'partnership', label: 'Partnership', description: 'Two or more partners' },
  { value: 'private_limited', label: 'Private Limited Company', description: 'Registered Pvt. Ltd.' },
  { value: 'retailer', label: 'Retail Shop', description: 'Physical retail store' },
  { value: 'wholesaler', label: 'Wholesaler/Distributor', description: 'Bulk supplier' },
  { value: 'manufacturer', label: 'Manufacturer', description: 'Product manufacturer' },
];

const PAKISTAN_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala',
  'Hyderabad', 'Bahawalpur', 'Sargodha', 'Abbottabad', 'Other',
];

const VendorRegister = () => {
  const [formData, setFormData] = useState({
    // Personal Details
    name: '',
    email: '',
    phone: '',
    cnicNumber: '',

    // Business Details
    businessName: '',
    businessType: '',
    businessRegistrationNumber: '', // NTN or Registration number (optional)
    yearsInBusiness: '',

    // Business Address
    businessAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Pakistan',
    },

    // Category & Operations
    accessoryCategory: '',
    hasPhysicalStore: false,
    websiteUrl: '',

    // Security
    password: '',
    confirmPassword: '',

    // Terms
    agreeToTerms: false,
    agreeToVerification: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // OTP Verification State
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [emailOTP, setEmailOTP] = useState(['', '', '', '', '', '']);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingEmailOTP, setSendingEmailOTP] = useState(false);
  const [verifyingEmailOTP, setVerifyingEmailOTP] = useState(false);
  const [emailOTPSent, setEmailOTPSent] = useState(false);
  const [emailResendTimer, setEmailResendTimer] = useState(0);
  const [otpErrors, setOtpErrors] = useState({ email: '' });

  const emailOTPRefs = useRef([]);

  const { showToast } = useToast();
  const { updateUser } = useAuth();
  const navigate = useNavigate();

  // Countdown timers for OTP resend
  useEffect(() => {
    let emailInterval;
    if (emailResendTimer > 0) {
      emailInterval = setInterval(() => {
        setEmailResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(emailInterval);
  }, [emailResendTimer]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Handle nested businessAddress fields
    if (name.startsWith('businessAddress.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        businessAddress: {
          ...formData.businessAddress,
          [field]: value,
        },
      });
    } else if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }

    // Clear specific field error when user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  // Format CNIC as user types (XXXXX-XXXXXXX-X)
  const handleCNICChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length > 13) value = value.slice(0, 13);

    // Format: XXXXX-XXXXXXX-X
    if (value.length > 5) {
      value = value.slice(0, 5) + '-' + value.slice(5);
    }
    if (value.length > 13) {
      value = value.slice(0, 13) + '-' + value.slice(13);
    }

    setFormData({ ...formData, cnicNumber: value });
    if (errors.cnicNumber) {
      setErrors({ ...errors, cnicNumber: '' });
    }
  };

  const validateStep1 = () => {
    const newErrors = {};

    // Personal Details Validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name cannot exceed 50 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^(\+92|0)3[0-9]{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Enter valid Pakistani mobile (03XXXXXXXXX or +923XXXXXXXXX)';
    }

    if (!formData.cnicNumber.trim()) {
      newErrors.cnicNumber = 'CNIC number is required for verification';
    } else if (!/^\d{5}-\d{7}-\d{1}$/.test(formData.cnicNumber)) {
      newErrors.cnicNumber = 'CNIC must be in format XXXXX-XXXXXXX-X';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    // Business Details Validation
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business/Shop name is required';
    } else if (formData.businessName.length > 100) {
      newErrors.businessName = 'Business name cannot exceed 100 characters';
    }

    if (!formData.businessType) {
      newErrors.businessType = 'Please select your business type';
    }

    if (!formData.businessAddress.city) {
      newErrors['businessAddress.city'] = 'City is required';
    }

    if (!formData.accessoryCategory) {
      newErrors.accessoryCategory = 'Please select your primary product category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};

    // Password Validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/.test(formData.password)) {
      newErrors.password = 'Min 8 characters with uppercase, lowercase, number & special character';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to Terms & Conditions';
    }

    if (!formData.agreeToVerification) {
      newErrors.agreeToVerification = 'You must agree to the verification process';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // OTP Input Handlers
  const handleOTPChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newOTP = [...emailOTP];
    newOTP[index] = value;
    setEmailOTP(newOTP);
    setOtpErrors({ email: '' });

    if (value && index < 5) {
      emailOTPRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !emailOTP[index] && index > 0) {
      emailOTPRefs.current[index - 1]?.focus();
    }
  };

  const handleOTPPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

    if (pastedData.length === 6) {
      setEmailOTP(pastedData.split(''));
      setOtpErrors({ email: '' });
    }
  };

  // Send Email OTP
  const sendEmailOTP = async () => {
    setSendingEmailOTP(true);
    setOtpErrors({ ...otpErrors, email: '' });

    try {
      const response = await api.post('/vendor/pre-register/send-email-otp', {
        email: formData.email,
      });

      if (response.data.success) {
        setEmailOTPSent(true);
        setEmailResendTimer(60);
        showToast('OTP sent to your email address', 'success');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to send email OTP';
      setOtpErrors({ ...otpErrors, email: errorMessage });
      showToast(errorMessage, 'error');
    } finally {
      setSendingEmailOTP(false);
    }
  };

  // Verify Email OTP
  const verifyEmailOTP = async () => {
    const otpCode = emailOTP.join('');
    if (otpCode.length !== 6) {
      setOtpErrors({ ...otpErrors, email: 'Please enter complete 6-digit OTP' });
      return;
    }

    setVerifyingEmailOTP(true);
    setOtpErrors({ ...otpErrors, email: '' });

    try {
      const response = await api.post('/vendor/pre-register/verify-email-otp', {
        email: formData.email,
        otp: otpCode,
      });

      if (response.data.success) {
        setEmailVerified(true);
        showToast('Email verified successfully', 'success');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Invalid OTP. Please try again.';
      setOtpErrors({ ...otpErrors, email: errorMessage });
    } finally {
      setVerifyingEmailOTP(false);
    }
  };

  // Initiate OTP verification process (email only)
  const initiateOTPVerification = async () => {
    if (!validateStep1()) return;

    setShowOTPVerification(true);
    await sendEmailOTP();
  };

  // Proceed to Step 2 after email verification
  const proceedAfterVerification = () => {
    if (emailVerified) {
      setShowOTPVerification(false);
      setCurrentStep(2);
    } else {
      showToast('Please verify your email to continue', 'error');
    }
  };

  // Go back to edit personal info
  const goBackToPersonalInfo = () => {
    setShowOTPVerification(false);
    setEmailOTP(['', '', '', '', '', '']);
    setEmailVerified(false);
    setEmailOTPSent(false);
    setOtpErrors({ email: '' });
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      // Instead of going directly to step 2, show OTP verification
      initiateOTPVerification();
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep3()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    // Ensure email was pre-verified
    if (!emailVerified) {
      showToast('Please complete email verification first', 'error');
      setCurrentStep(1);
      setShowOTPVerification(true);
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, agreeToTerms, agreeToVerification, ...submitData } = formData;

      const response = await api.post('/vendor/register', submitData);

      if (response.data.success) {
        showToast('Account created successfully! Welcome to AutoSphere.', 'success');

        // Store token and user in localStorage and context
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          updateUser(response.data.user);
        }

        // Navigate to vendor dashboard for CNIC verification
        navigate('/vendor/dashboard', {
          state: {
            newRegistration: true,
            message: 'Complete your identity verification to start selling',
          }
        });
      }
    } catch (err) {
      if (err.response?.data?.code === 'VERIFICATION_REQUIRED') {
        showToast('Please verify your email first', 'error');
        setCurrentStep(1);
        setShowOTPVerification(true);
        return;
      }

      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const backendErrors = {};
        err.response.data.errors.forEach((error) => {
          if (error.path) {
            backendErrors[error.path] = error.msg;
          }
        });
        setErrors(backendErrors);
        showToast('Please fix the errors in the form', 'error');
      } else {
        const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
        showToast(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { label: 'Weak', color: 'bg-red-500', textColor: 'text-red-400', width: '33%' };
    if (strength <= 4) return { label: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-400', width: '66%' };
    return { label: 'Strong', color: 'bg-green-500', textColor: 'text-green-400', width: '100%' };
  };

  const passwordStrength = formData.password ? getPasswordStrength(formData.password) : null;

  const steps = [
    { number: 1, title: 'Personal Info', icon: User },
    { number: 2, title: 'Business Details', icon: Building2 },
    { number: 3, title: 'Security', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-secondary-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-800 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Become a Vendor Partner</h1>
          <p className="text-text-secondary">
            Join Pakistan's leading car accessories marketplace
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface-light text-text-tertiary'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${
                    isActive ? 'text-primary-400' : isCompleted ? 'text-green-400' : 'text-text-tertiary'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 mb-5 ${
                    currentStep > step.number ? 'bg-green-500' : 'bg-surface-light'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Form Card */}
        <div className="bg-surface rounded-2xl shadow-card border border-surface-light p-6 md:p-8">
          {/* OTP Verification Modal/Screen */}
          {showOTPVerification && (
            <div className="animate-fadeIn">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-light">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-500" />
                  <h3 className="text-lg font-semibold text-text-primary">Verify Your Contact</h3>
                </div>
                <button
                  type="button"
                  onClick={goBackToPersonalInfo}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-text-secondary text-sm mb-6">
                We've sent a verification code to your email. Please enter it below to continue.
              </p>

              <div className="space-y-8">
                {/* Email OTP Section */}
                <div className={`p-5 rounded-xl border-2 transition-all ${
                  emailVerified
                    ? 'border-green-500/50 bg-green-500/5'
                    : 'border-surface-light'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        emailVerified ? 'bg-green-500' : 'bg-primary-500/20'
                      }`}>
                        {emailVerified ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <Mail className="w-5 h-5 text-primary-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-text-primary">Email Verification</h4>
                        <p className="text-xs text-text-tertiary">{formData.email}</p>
                      </div>
                    </div>
                    {emailVerified && (
                      <span className="text-green-400 text-sm font-medium flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Verified
                      </span>
                    )}
                  </div>

                  {!emailVerified && (
                    <>
                      <div className="flex justify-center gap-2 mb-4">
                        {emailOTP.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => (emailOTPRefs.current[index] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOTPChange(index, e.target.value)}
                            onKeyDown={(e) => handleOTPKeyDown(index, e)}
                            onPaste={handleOTPPaste}
                            className={`w-12 h-14 text-center text-xl font-semibold rounded-lg border-2 bg-secondary-800 text-text-primary focus:outline-none focus:border-primary-500 transition-colors ${
                              otpErrors.email ? 'border-red-500' : 'border-surface-light'
                            }`}
                          />
                        ))}
                      </div>

                      {otpErrors.email && (
                        <p className="text-red-400 text-sm text-center mb-3">{otpErrors.email}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={sendEmailOTP}
                          disabled={sendingEmailOTP || emailResendTimer > 0}
                          className="text-sm text-primary-400 hover:text-primary-300 disabled:text-text-tertiary disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {sendingEmailOTP ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Sending...
                            </>
                          ) : emailResendTimer > 0 ? (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Resend in {emailResendTimer}s
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Resend OTP
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={verifyEmailOTP}
                          disabled={verifyingEmailOTP || emailOTP.join('').length !== 6}
                          className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:bg-surface-light disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                          {verifyingEmailOTP ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            'Verify Email'
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={goBackToPersonalInfo}
                  className="flex-1 btn-secondary"
                >
                  Edit Details
                </button>
                <button
                  type="button"
                  onClick={proceedAfterVerification}
                  disabled={!emailVerified}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    emailVerified
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-surface-light text-text-tertiary cursor-not-allowed'
                  }`}
                >
                  {emailVerified ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Continue to Business Details
                    </>
                  ) : (
                    'Verify Email to Continue'
                  )}
                </button>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-sm text-blue-300">
                  <strong>Didn't receive the OTP?</strong> Check your spam/junk folder. You can resend after 60 seconds.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className={showOTPVerification ? 'hidden' : ''}>
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-surface-light">
                  <User className="w-5 h-5 text-primary-500" />
                  <h3 className="text-lg font-semibold text-text-primary">Personal Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Full Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Full Name (as per CNIC) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                      <input
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        className={`input-field pl-10 ${errors.name ? 'border-red-500' : ''}`}
                        placeholder="Muhammad Ahmed Khan"
                      />
                    </div>
                    {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                    <p className="mt-1 text-xs text-text-tertiary">Must match exactly with your CNIC for verification</p>
                  </div>

                  {/* CNIC Number */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      CNIC Number <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                      <input
                        name="cnicNumber"
                        type="text"
                        value={formData.cnicNumber}
                        onChange={handleCNICChange}
                        className={`input-field pl-10 ${errors.cnicNumber ? 'border-red-500' : ''}`}
                        placeholder="35201-1234567-9"
                        maxLength={15}
                      />
                    </div>
                    {errors.cnicNumber && <p className="mt-1 text-sm text-red-400">{errors.cnicNumber}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Mobile Number <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                      <input
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`input-field pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                        placeholder="03001234567"
                      />
                    </div>
                    {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
                    <p className="mt-1 text-xs text-text-tertiary">Stored for contact purposes</p>
                  </div>

                  {/* Email */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Business Email <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                      <input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`input-field pl-10 ${errors.email ? 'border-red-500' : ''}`}
                        placeholder="your.business@email.com"
                      />
                    </div>
                    {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full btn-primary mt-6"
                >
                  Continue to Business Details
                </button>
              </div>
            )}

            {/* Step 2: Business Details */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-surface-light">
                  <Building2 className="w-5 h-5 text-primary-500" />
                  <h3 className="text-lg font-semibold text-text-primary">Business Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Business Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Business/Shop Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                      <input
                        name="businessName"
                        type="text"
                        value={formData.businessName}
                        onChange={handleChange}
                        className={`input-field pl-10 ${errors.businessName ? 'border-red-500' : ''}`}
                        placeholder="Khan Auto Accessories"
                      />
                    </div>
                    {errors.businessName && <p className="mt-1 text-sm text-red-400">{errors.businessName}</p>}
                  </div>

                  {/* Business Type */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Business Type <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {BUSINESS_TYPES.map((type) => (
                        <label
                          key={type.value}
                          className={`relative flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            formData.businessType === type.value
                              ? 'border-primary-500 bg-primary-500/10'
                              : 'border-surface-light hover:border-primary-500/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="businessType"
                            value={type.value}
                            checked={formData.businessType === type.value}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          <span className="font-medium text-text-primary text-sm">{type.label}</span>
                          <span className="text-xs text-text-tertiary">{type.description}</span>
                          {formData.businessType === type.value && (
                            <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-primary-500" />
                          )}
                        </label>
                      ))}
                    </div>
                    {errors.businessType && <p className="mt-1 text-sm text-red-400">{errors.businessType}</p>}
                  </div>

                  {/* NTN/Registration Number (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      NTN / Business Registration No. <span className="text-text-tertiary">(Optional)</span>
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                      <input
                        name="businessRegistrationNumber"
                        type="text"
                        value={formData.businessRegistrationNumber}
                        onChange={handleChange}
                        className="input-field pl-10"
                        placeholder="1234567-8"
                      />
                    </div>
                    <p className="mt-1 text-xs text-text-tertiary">Helps build trust with customers</p>
                  </div>

                  {/* Years in Business */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Years in Business
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                      <select
                        name="yearsInBusiness"
                        value={formData.yearsInBusiness}
                        onChange={handleChange}
                        className="input-field pl-10"
                      >
                        <option value="">Select experience</option>
                        <option value="new">New Business (Less than 1 year)</option>
                        <option value="1-3">1-3 Years</option>
                        <option value="3-5">3-5 Years</option>
                        <option value="5-10">5-10 Years</option>
                        <option value="10+">10+ Years</option>
                      </select>
                    </div>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Business City <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                      <select
                        name="businessAddress.city"
                        value={formData.businessAddress.city}
                        onChange={handleChange}
                        className={`input-field pl-10 ${errors['businessAddress.city'] ? 'border-red-500' : ''}`}
                      >
                        <option value="">Select city</option>
                        {PAKISTAN_CITIES.map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                    {errors['businessAddress.city'] && (
                      <p className="mt-1 text-sm text-red-400">{errors['businessAddress.city']}</p>
                    )}
                  </div>

                  {/* State/Province */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Province
                    </label>
                    <select
                      name="businessAddress.state"
                      value={formData.businessAddress.state}
                      onChange={handleChange}
                      className="input-field"
                    >
                      <option value="">Select province</option>
                      <option value="Punjab">Punjab</option>
                      <option value="Sindh">Sindh</option>
                      <option value="KPK">Khyber Pakhtunkhwa</option>
                      <option value="Balochistan">Balochistan</option>
                      <option value="Islamabad">Islamabad Capital Territory</option>
                      <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                      <option value="AJK">Azad Jammu & Kashmir</option>
                    </select>
                  </div>

                  {/* Street Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Shop/Business Address
                    </label>
                    <input
                      name="businessAddress.street"
                      type="text"
                      value={formData.businessAddress.street}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Shop # 12, Auto Market, Main Boulevard"
                    />
                  </div>

                  {/* Accessory Category */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Primary Product Category <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                      <select
                        name="accessoryCategory"
                        value={formData.accessoryCategory}
                        onChange={handleChange}
                        className={`input-field pl-10 ${errors.accessoryCategory ? 'border-red-500' : ''}`}
                      >
                        <option value="">What do you primarily sell?</option>
                        {ACCESSORY_CATEGORIES.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    {errors.accessoryCategory && (
                      <p className="mt-1 text-sm text-red-400">{errors.accessoryCategory}</p>
                    )}
                  </div>

                  {/* Physical Store Checkbox */}
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="hasPhysicalStore"
                        checked={formData.hasPhysicalStore}
                        onChange={handleChange}
                        className="w-5 h-5 rounded border-surface-light bg-secondary-800 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-sm text-text-secondary">
                        I have a physical shop/showroom
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="flex-1 btn-secondary"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 btn-primary"
                  >
                    Continue to Security
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Security & Agreement */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-surface-light">
                  <Shield className="w-5 h-5 text-primary-500" />
                  <h3 className="text-lg font-semibold text-text-primary">Account Security</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Create Password <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange}
                        className={`input-field pr-12 ${errors.password ? 'border-red-500' : ''}`}
                        placeholder="Create a strong password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
                    {passwordStrength && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-text-tertiary">Strength:</span>
                          <span className={passwordStrength.textColor}>{passwordStrength.label}</span>
                        </div>
                        <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
                          <div
                            className={`h-full ${passwordStrength.color} transition-all`}
                            style={{ width: passwordStrength.width }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Confirm Password <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`input-field pr-12 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                        placeholder="Confirm your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
                    )}
                    {formData.confirmPassword && formData.password === formData.confirmPassword && (
                      <p className="mt-1 text-sm text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Passwords match
                      </p>
                    )}
                  </div>
                </div>

                {/* Verification Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    What's Next After Registration
                  </h4>
                  <ul className="text-sm text-blue-300 space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-300">Email verified</span>
                    </li>
                    <li>→ Upload CNIC (front & back) for identity verification</li>
                    <li>→ Get verified and start selling!</li>
                  </ul>
                  <p className="text-xs text-text-tertiary mt-3">
                    Identity verification happens in your dashboard after account creation.
                  </p>
                </div>

                {/* Terms & Conditions */}
                <div className="space-y-3">
                  <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-all ${
                    formData.agreeToTerms ? 'border-primary-500 bg-primary-500/5' : 'border-surface-light'
                  }`}>
                    <input
                      type="checkbox"
                      name="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onChange={handleChange}
                      className="w-5 h-5 mt-0.5 rounded border-surface-light bg-secondary-800 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm text-text-secondary">
                      I agree to AutoSphere's{' '}
                      <Link to="/terms" className="text-primary-400 hover:underline">Terms & Conditions</Link>
                      {' '}and{' '}
                      <Link to="/privacy" className="text-primary-400 hover:underline">Privacy Policy</Link>
                      <span className="text-red-400"> *</span>
                    </span>
                  </label>
                  {errors.agreeToTerms && <p className="text-sm text-red-400 ml-8">{errors.agreeToTerms}</p>}

                  <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-all ${
                    formData.agreeToVerification ? 'border-primary-500 bg-primary-500/5' : 'border-surface-light'
                  }`}>
                    <input
                      type="checkbox"
                      name="agreeToVerification"
                      checked={formData.agreeToVerification}
                      onChange={handleChange}
                      className="w-5 h-5 mt-0.5 rounded border-surface-light bg-secondary-800 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm text-text-secondary">
                      I consent to identity verification using my CNIC and live photo for security purposes
                      <span className="text-red-400"> *</span>
                    </span>
                  </label>
                  {errors.agreeToVerification && <p className="text-sm text-red-400 ml-8">{errors.agreeToVerification}</p>}
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="flex-1 btn-secondary"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 btn-primary"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="spinner"></span>
                        Creating Account...
                      </span>
                    ) : (
                      'Create Vendor Account'
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 pt-6 border-t border-surface-light text-center">
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-500 hover:text-primary-400">
                Sign in here
              </Link>
            </p>
            <p className="text-sm text-text-tertiary mt-2">
              Want to buy instead?{' '}
              <Link to="/register" className="font-semibold text-primary-500 hover:text-primary-400">
                Register as customer
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorRegister;
