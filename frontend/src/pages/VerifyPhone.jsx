import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Phone } from 'lucide-react';
import api from '../services/api';

const VerifyPhone = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const { showToast } = useToast();

  // Get data from navigation state or session storage
  const email = location.state?.email || sessionStorage.getItem('vendorEmail');
  const phone = location.state?.phone || sessionStorage.getItem('vendorPhone');

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);

  // Store data in session storage for page refresh
  useEffect(() => {
    if (location.state?.email) {
      sessionStorage.setItem('vendorEmail', location.state.email);
    }
    if (location.state?.phone) {
      sessionStorage.setItem('vendorPhone', location.state.phone);
    }
  }, [location.state]);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      showToast('Please complete email verification first', 'error');
      navigate('/verify-email');
    }
  }, [email, navigate, showToast]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);

    if (!/^\d+$/.test(pastedData)) {
      showToast('Please paste only numbers', 'error');
      return;
    }

    const newOtp = pastedData.split('').slice(0, 6);
    while (newOtp.length < 6) {
      newOtp.push('');
    }
    setOtp(newOtp);

    // Focus last filled input or first empty
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const otpString = otp.join('');

    if (otpString.length !== 6) {
      const msg = 'Please enter all 6 digits';
      setError(msg);
      showToast(msg, 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/vendor/verify-phone', {
        email,
        otp: otpString,
      });

      if (response.data.success) {
        const { user, token } = response.data.data;

        // Store auth data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);

        // Clear session storage
        sessionStorage.removeItem('vendorEmail');
        sessionStorage.removeItem('vendorPhone');
        sessionStorage.removeItem('verificationEmail');

        showToast('Phone verified successfully! Welcome to AutoSphere.', 'success');
        navigate('/dashboard/vendor');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Invalid or expired OTP';
      setError(errorMessage);
      showToast(errorMessage, 'error');

      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setResending(true);
    try {
      await api.post('/vendor/resend-phone-otp', { email });
      showToast('New verification code sent to your phone!', 'success');
      setOtp(['', '', '', '', '', '']);
      setError('');
      inputRefs.current[0]?.focus();
      // Set 60 second cooldown
      setResendCooldown(60);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to resend code. Please try again.';
      showToast(errorMessage, 'error');
    } finally {
      setResending(false);
    }
  };

  // Mask phone number for display
  const maskedPhone = phone
    ? phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1***$3')
    : 'your registered phone';

  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Phone className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="heading-2 mb-3">Verify Your Phone</h2>
          <p className="text-body">
            We've sent a 6-digit verification code to
          </p>
          <p className="text-blue-400 font-semibold mt-1">{maskedPhone}</p>
        </div>

        {/* Form Card */}
        <div className="bg-surface rounded-2xl shadow-card border border-surface-light p-8 space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-900/30 border-l-4 border-blue-500 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-300">
                  Email verified! Now verify your phone number to continue.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-primary-900/30 border-l-4 border-primary-500 p-4 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-primary-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OTP Input Boxes */}
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-4 text-center">
                Enter 6-Digit Verification Code
              </label>
              <div className="flex justify-center gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold bg-secondary-800 border-2 rounded-lg transition-all text-text-primary focus:ring-2 focus:ring-blue-500/20 ${
                      error
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-surface-light focus:border-blue-500'
                    }`}
                    disabled={loading}
                  />
                ))}
              </div>
              <p className="mt-4 text-xs text-text-tertiary text-center">
                The code will expire in 10 minutes
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.some(d => !d)}
              className="w-full btn-primary"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="spinner mr-2"></span>
                  Verifying...
                </span>
              ) : (
                'Verify Phone'
              )}
            </button>
          </form>

          {/* Resend OTP */}
          <div className="text-center space-y-3">
            <p className="text-sm text-text-secondary">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResendOTP}
              disabled={resending || resendCooldown > 0}
              className={`text-sm font-medium transition-colors ${
                resendCooldown > 0
                  ? 'text-text-tertiary cursor-not-allowed'
                  : 'text-blue-400 hover:text-blue-300'
              }`}
            >
              {resending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner-sm"></span>
                  Sending...
                </span>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                'Resend Code'
              )}
            </button>
          </div>
        </div>

        {/* Security Note */}
        <div className="bg-surface rounded-lg border border-surface-light p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="text-xs text-text-secondary">
              <p className="font-semibold text-text-primary mb-1">Security Notice</p>
              <p>Never share your verification code with anyone. We will never ask for your code via call or message.</p>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="text-center">
          <p className="text-sm text-text-tertiary mb-2">Verification Progress</p>
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="ml-1 text-xs text-green-400">Email</span>
            </div>
            <div className="w-8 h-0.5 bg-surface-light" />
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                <span className="text-xs text-white font-bold">2</span>
              </div>
              <span className="ml-1 text-xs text-blue-400">Phone</span>
            </div>
            <div className="w-8 h-0.5 bg-surface-light" />
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-surface-light flex items-center justify-center">
                <span className="text-xs text-text-tertiary font-bold">3</span>
              </div>
              <span className="ml-1 text-xs text-text-tertiary">Identity</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyPhone;
