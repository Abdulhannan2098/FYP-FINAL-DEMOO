import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { SessionTimeoutProvider } from './context/SessionTimeoutContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { ChatProvider } from './context/ChatContext.jsx';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const VerifyOTP = lazy(() => import('./pages/VerifyOTP'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const VerifyPhone = lazy(() => import('./pages/VerifyPhone'));
const VendorRegister = lazy(() => import('./pages/VendorRegister'));
const VendorVerification = lazy(() => import('./pages/VendorVerification'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Contact = lazy(() => import('./pages/Contact'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Chat = lazy(() => import('./pages/Chat'));
const CustomerDashboard = lazy(() => import('./pages/dashboards/CustomerDashboard'));
const VendorDashboard = lazy(() => import('./pages/dashboards/VendorDashboard'));
const AdminDashboard = lazy(() => import('./pages/dashboards/AdminDashboard'));
const VendorPricingPage = lazy(() => import('./pages/VendorPricingPage'));

// Profile/Account Management Pages
const ProfileSettings = lazy(() => import('./pages/account/ProfileSettings'));
const ChangePassword = lazy(() => import('./pages/account/ChangePassword'));
const VendorSettings = lazy(() => import('./pages/dashboards/VendorSettings'));

// Wrapper component for Products page to redirect vendors and admins
const ProductsPage = () => {
  const { user } = useAuth();

  if (user?.role === 'vendor') {
    return <Navigate to="/dashboard/vendor" replace />;
  }

  if (user?.role === 'admin') {
    return <Navigate to="/dashboard/admin" replace />;
  }

  return <Products />;
};

// Wrapper component for Contact page to redirect admins
const ContactPage = () => {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <Navigate to="/dashboard/admin" replace />;
  }

  return <Contact />;
};

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading AutoSphere..." />
      </div>
    );
  }

  return (
    <Router>
      <SessionTimeoutProvider>
        <SocketProvider>
          <ChatProvider>
            <Header />
            <Suspense
              fallback={
                <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
                  <LoadingSpinner size="lg" message="Loading page..." />
                </div>
              }
            >
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verify-otp" element={<VerifyOTP />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/verify-phone" element={<VerifyPhone />} />
              <Route path="/vendor/register" element={<VendorRegister />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<OAuthCallback />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/wishlist" element={<Wishlist />} />

              {/* Protected Routes */}
              <Route
                path="/chat"
                element={
                  <ProtectedRoute allowedRoles={['customer', 'vendor', 'admin']}>
                    <Chat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/customer"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/vendor"
                element={
                  <ProtectedRoute allowedRoles={['vendor']}>
                    <VendorDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/vendor/pricing"
                element={
                  <ProtectedRoute allowedRoles={['vendor']}>
                    <VendorPricingPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Account/Profile Settings Routes */}
              <Route
                path="/account/profile"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <ProfileSettings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/account/password"
                element={
                  <ProtectedRoute allowedRoles={['customer', 'vendor', 'admin']}>
                    <ChangePassword />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/vendor/settings"
                element={
                  <ProtectedRoute allowedRoles={['vendor']}>
                    <VendorSettings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/vendor/verification"
                element={
                  <ProtectedRoute allowedRoles={['vendor']}>
                    <VendorVerification />
                  </ProtectedRoute>
                }
              />

              {/* Redirect unknown routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <Footer />
          </ChatProvider>
        </SocketProvider>
      </SessionTimeoutProvider>
    </Router>
  );
}

export default App;
