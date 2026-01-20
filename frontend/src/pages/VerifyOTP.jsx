import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext.jsx';
import api from '../services/api';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const email = location.state?.email || sessionStorage.getItem('resetEmail');

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      showToast('Please request an OTP first', 'error');
      navigate('/forgot-password');
    }
  }, [email, navigate, showToast]);

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
      await api.post('/auth/verify-otp', { email, otp: otpString });
      showToast('OTP verified successfully!', 'success');

      // Persist OTP so refresh/navigation doesn't break the flow
      sessionStorage.setItem('resetOtp', otpString);

      // Navigate to reset password page with email and OTP
      navigate('/reset-password', { state: { email, otp: otpString } });
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
    try {
      await api.post('/auth/forgot-password', { email });
      showToast('New OTP sent to your email!', 'success');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      showToast('Failed to resend OTP. Please try again.', 'error');
    }
  };

  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-800 to-primary-700 rounded-2xl flex items-center justify-center shadow-neon-red">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h2 className="heading-2 mb-3">Enter Verification Code</h2>
          <p className="text-body">
            We've sent a 6-digit code to
          </p>
          <p className="text-primary-400 font-semibold mt-1">{email}</p>
        </div>

        {/* Form Card */}
        <div className="bg-surface rounded-2xl shadow-card border border-surface-light p-8 space-y-6">
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
                Enter 6-Digit Code
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
                    className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold bg-secondary-800 border-2 rounded-lg transition-all text-text-primary focus:ring-2 focus:ring-primary-500/20 ${
                      error
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-surface-light focus:border-primary-500'
                    }`}
                    disabled={loading}
                  />
                ))}
              </div>
              {error && (
                <p className="mt-3 text-sm text-red-400 text-center">{error}</p>
              )}
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
                'Verify Code'
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
              className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
            >
              Resend Code
            </button>
          </div>

          <div className="text-center pt-4 border-t border-surface-light">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Change Email Address
            </Link>
          </div>
        </div>

        {/* Security Note */}
        <div className="bg-surface rounded-lg border border-surface-light p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="text-xs text-text-secondary">
              <p className="font-semibold text-text-primary mb-1">Security Notice</p>
              <p>Never share your verification code with anyone, including AutoSphere staff.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
