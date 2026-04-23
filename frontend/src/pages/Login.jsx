import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const showQuickTestLogin =
    import.meta.env.DEV || import.meta.env.VITE_ENABLE_QUICK_TEST_LOGIN === 'true';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear specific field error when user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'password':
        if (!value) {
          error = 'Password is required';
        }
        break;
      default:
        break;
    }
    
    return error;
  };

  const doLogin = async (email, password) => {
    setLoading(true);
    try {
      const user = await login(email, password);

      showToast(`Welcome back, ${user.name}!`, 'success');

      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/dashboard/admin');
      } else if (user.role === 'vendor') {
        navigate('/dashboard/vendor');
      } else {
        navigate('/dashboard/customer');
      }
    } catch (err) {
      const errorCode = err.response?.data?.code;
      const errorData = err.response?.data?.data;

      // Check if email is not verified (skip for admin users)
      if (errorCode === 'EMAIL_NOT_VERIFIED' && errorData?.role !== 'admin') {
        const userEmail = errorData?.email || email;
        const isVendor = errorData?.isVendor || errorData?.role === 'vendor';
        showToast('Please verify your email to continue', 'warning');

        // Store vendor flag in session for the verification flow
        if (isVendor) {
          sessionStorage.setItem('isVendorRegistration', 'true');
        }

        navigate('/verify-email', {
          state: {
            email: userEmail,
            isVendor
          }
        });
        return;
      }

      // Check if phone is not verified (vendors only)
      if (errorCode === 'PHONE_NOT_VERIFIED') {
        const userEmail = errorData?.email || email;
        const userPhone = errorData?.phone;
        showToast('Please verify your phone number to continue', 'warning');

        // Store vendor flag in session for the verification flow
        sessionStorage.setItem('isVendorRegistration', 'true');

        navigate('/verify-phone', {
          state: {
            email: userEmail,
            phone: userPhone,
            isVendor: true
          }
        });
        return;
      }

      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    await doLogin(formData.email, formData.password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-800 to-primary-700 rounded-2xl flex items-center justify-center shadow-neon-red">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h2 className="heading-2 mb-3">Welcome Back</h2>
          <p className="text-body">
            Sign in to your AutoSphere account
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface rounded-2xl shadow-card border border-surface-light p-8 space-y-6">
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
                value={formData.email}
                onChange={handleChange}
                className={`input-field ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="abdul.hannan@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-semibold text-text-primary">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`input-field pr-12 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:text-primary-500"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="spinner mr-2"></span>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* OAuth Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-light"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-surface text-text-tertiary">Or continue with</span>
            </div>
          </div>

          {/* Google Login Button */}
          <button
            onClick={() => {
              window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/google`;
            }}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-surface-light rounded-xl hover:border-primary-500/50 hover:bg-surface-light transition-all duration-200 group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-text-primary font-medium group-hover:text-primary-400 transition-colors">
              Continue with Google
            </span>
          </button>

          {showQuickTestLogin && (
            <div className="mt-6 pt-4 border-t border-surface-light">
              <p className="text-xs text-text-tertiary mb-3">Quick Test Login</p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => doLogin('admin123@autosphere.com', 'Admin@123')}
                  className="w-full btn-secondary"
                >
                  Login as Admin
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => doLogin('abdul.hannan05455@gmail.com', 'Test@1234')}
                  className="w-full btn-secondary"
                >
                  Login as Vendor
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => doLogin('Sheikhhannan5455@gmail.com', 'Test@1234')}
                  className="w-full btn-secondary"
                >
                  Login as Customer
                </button>
              </div>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-text-secondary">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-primary-500 hover:text-primary-400 transition-colors">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
