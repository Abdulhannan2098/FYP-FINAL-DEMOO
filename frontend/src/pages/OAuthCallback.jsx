import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      console.log('OAuth Callback - Token:', token ? 'Present' : 'Missing');
      console.log('OAuth Callback - Error:', error);

      if (error) {
        let errorMessage = 'Authentication failed. Please try again.';
        if (error === 'authentication_failed') {
          errorMessage = 'Google authentication failed. Please try again.';
        } else if (error === 'server_error') {
          errorMessage = 'Server error occurred. Please try again later.';
        }
        showToast(errorMessage, 'error');
        navigate('/login');
        return;
      }

      if (!token) {
        showToast('No authentication token received', 'error');
        navigate('/login');
        return;
      }

      try {
        // Store token
        localStorage.setItem('token', token);

        // Fetch user data with the token
        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/me`;
        console.log('Fetching user data from:', apiUrl);
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Response error:', errorData);
          throw new Error(errorData.message || 'Failed to fetch user data');
        }

        const data = await response.json();
        console.log('User data received:', data);
        const user = data.data;

        // Store user in localStorage
        localStorage.setItem('user', JSON.stringify(user));

        showToast(`Welcome ${user.name}!`, 'success');

        // Redirect based on role - give a small delay for state updates
        setTimeout(() => {
          if (user.role === 'admin') {
            navigate('/dashboard/admin');
          } else if (user.role === 'vendor') {
            navigate('/dashboard/vendor');
          } else {
            navigate('/dashboard/customer');
          }
          // Force page reload to update auth state
          window.location.reload();
        }, 100);
      } catch (error) {
        console.error('OAuth callback error:', error);
        showToast('Failed to complete authentication. Please try again.', 'error');
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, showToast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-900">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-text-secondary mt-4">Completing authentication...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
