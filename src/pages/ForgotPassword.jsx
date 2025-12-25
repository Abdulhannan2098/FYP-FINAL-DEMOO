import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext.jsx';
import api from '../services/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      showToast('Verification code sent to your email!', 'success');

      // Navigate to OTP verification page
      navigate('/verify-otp', { state: { email } });
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to send verification code. Please try again.';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-800 to-primary-700 rounded-2xl flex items-center justify-center shadow-neon-red">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
          </div>
          <h2 className="heading-2 mb-3">Forgot Password?</h2>
          <p className="text-body">
            No worries, we'll send you a verification code to reset your password
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface rounded-2xl shadow-card border border-surface-light p-8 space-y-6">
          {/* Request Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-text-primary mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="you@example.com"
                  />
                  <p className="mt-2 text-xs text-text-tertiary">
                    Enter the email address associated with your account
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <span className="spinner mr-2"></span>
                      Sending OTP...
                    </span>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </form>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Login
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
                <p>For security reasons, we won't reveal whether this email exists in our system.</p>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
