import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const Register = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'vendor' ? 'vendor' : 'customer';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: initialRole,
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); // Clear error on input change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      const errorMsg = 'Passwords do not match';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...userData } = formData;
      const user = await register(userData);

      showToast(`Welcome to AutoSphere, ${user.name}!`, 'success');

      if (user.role === 'vendor') {
        navigate('/dashboard/vendor');
      } else {
        navigate('/dashboard/customer');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.message ||
        'Registration failed. Please try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-800 to-primary-700 rounded-2xl flex items-center justify-center shadow-neon-red">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
          </div>
          <h2 className="heading-2 mb-3">Create Your Account</h2>
          <p className="text-body">
            Join AutoSphere marketplace today
          </p>
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
            {/* Account Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-4">
                I want to register as
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'customer' })}
                  className={`p-5 rounded-xl border-2 transition-all duration-200 ${
                    formData.role === 'customer'
                      ? 'border-primary-500 bg-primary-900/20 shadow-neon-red'
                      : 'border-surface-light hover:border-surface-lighter bg-surface-light'
                  }`}
                >
                  <div className="text-center">
                    <svg className={`w-9 h-9 mx-auto mb-3 ${formData.role === 'customer' ? 'text-primary-500' : 'text-text-tertiary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <p className={`font-bold ${formData.role === 'customer' ? 'text-primary-500' : 'text-text-primary'}`}>Customer</p>
                    <p className="text-xs text-text-tertiary mt-1">Buy products</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'vendor' })}
                  className={`p-5 rounded-xl border-2 transition-all duration-200 ${
                    formData.role === 'vendor'
                      ? 'border-primary-500 bg-primary-900/20 shadow-neon-red'
                      : 'border-surface-light hover:border-surface-lighter bg-surface-light'
                  }`}
                >
                  <div className="text-center">
                    <svg className={`w-9 h-9 mx-auto mb-3 ${formData.role === 'vendor' ? 'text-primary-500' : 'text-text-tertiary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className={`font-bold ${formData.role === 'vendor' ? 'text-primary-500' : 'text-text-primary'}`}>Vendor</p>
                    <p className="text-xs text-text-tertiary mt-1">Sell products</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-text-primary mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Abdul Hannan"
                />
              </div>

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
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="abdul.hannan@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-text-primary mb-2">
                  Phone <span className="text-text-tertiary">(Optional)</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="+92 300 1234567"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-text-primary mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-text-primary mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="••••••••"
                />
                <p className="mt-2 text-xs text-text-tertiary">
                  Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="spinner mr-2"></span>
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-500 hover:text-primary-400 transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
