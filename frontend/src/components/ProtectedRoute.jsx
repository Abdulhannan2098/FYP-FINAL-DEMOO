import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // ✅ wrapped in a div
  }

  if (!user) {
    return <Navigate to="/login" replace />; // ✅ redirect to login if not logged in
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const roleDashboard =
      user.role === 'admin'
        ? '/dashboard/admin'
        : user.role === 'vendor'
        ? '/dashboard/vendor'
        : user.role === 'customer'
        ? '/dashboard/customer'
        : '/';

    return <Navigate to={roleDashboard} replace />; // ✅ redirect if user role is not allowed
  }

  return <>{children}</>; // ✅ render children if authorized
};

export default ProtectedRoute;
