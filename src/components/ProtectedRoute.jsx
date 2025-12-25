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
    return <Navigate to="/" replace />; // ✅ redirect if user role is not allowed
  }

  return <>{children}</>; // ✅ render children if authorized
};

export default ProtectedRoute;
