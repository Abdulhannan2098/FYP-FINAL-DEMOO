import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { resolveImageUrl } from '../utils/imageHelper';
import ChatNotificationBadge from './chat/ChatNotificationBadge.jsx';

const Header = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const { getCartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const userMenuRef = useRef(null);

  // Reset avatar error when user changes
  useEffect(() => {
    setAvatarError(false);
  }, [user?.profileImage, user?.avatar]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  // Get user avatar URL with priority: profileImage > avatar > null
  const getUserAvatarUrl = () => {
    if (avatarError) return null;

    if (user?.profileImage) {
      const url = resolveImageUrl(user.profileImage);
      return url || null;
    }
    if (user?.avatar) {
      return user.avatar;
    }
    return null;
  };

  const avatarUrl = getUserAvatarUrl();

  const getSettingsLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'vendor':
        return '/dashboard/vendor/settings';
      case 'admin':
        return '/dashboard/admin'; // Admin settings can be added later
      case 'customer':
      default:
        return '/account/profile';
    }
  };

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'info');
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'admin':
        return '/dashboard/admin';
      case 'vendor':
        return '/dashboard/vendor';
      case 'customer':
        return '/dashboard/customer';
      default:
        return '/';
    }
  };

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'admin':
        return 'bg-purple-900/50 text-purple-300 border border-purple-700';
      case 'vendor':
        return 'bg-blue-900/50 text-blue-300 border border-blue-700';
      case 'customer':
        return 'bg-green-900/50 text-green-300 border border-green-700';
      default:
        return 'bg-surface-light text-text-secondary border border-surface-lighter';
    }
  };

  const getLogoLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'admin':
        return '/dashboard/admin';
      case 'vendor':
        return '/dashboard/vendor';
      case 'customer':
        return '/';
      default:
        return '/';
    }
  };

  return (
    <header className="bg-secondary-900/95 backdrop-blur-md border-b border-surface-light sticky top-0 z-50 shadow-strong">
      <div className="container-custom">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to={getLogoLink()} className="flex items-center space-x-2 sm:space-x-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-primary-800 to-primary-700 rounded-lg flex items-center justify-center group-hover:shadow-neon-red transition-all duration-300 group-hover:scale-110">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                {/* Sports car silhouette - sleek and aerodynamic */}
                <path d="M5 11l1.5-4.5h11L19 11m-1.5 8a1.5 1.5 0 01-1.5-1.5 1.5 1.5 0 011.5-1.5 1.5 1.5 0 011.5 1.5 1.5 1.5 0 01-1.5 1.5m-11 0A1.5 1.5 0 015 17.5 1.5 1.5 0 016.5 16 1.5 1.5 0 018 17.5 1.5 1.5 0 016.5 19M20 8h-2l-1.5-4.5h-9L6 8H4c-1.11 0-2 .89-2 2v8c0 .55.45 1 1 1h1a2.5 2.5 0 002.5-2.5A2.5 2.5 0 009 19h6a2.5 2.5 0 002.5-2.5 2.5 2.5 0 002.5 2.5h1c.55 0 1-.45 1-1v-8c0-1.11-.89-2-2-2z"/>
                {/* Windshield detail */}
                <path d="M7.5 8L8.5 5h7l1 3z" fillOpacity="0.3"/>
              </svg>
            </div>
            <span className="font-display text-lg sm:text-2xl font-bold text-text-primary tracking-tight">AutoSphere</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {/* Hide Products and Contact pages for admin */}
            {user?.role !== 'vendor' && user?.role !== 'admin' && (
              <Link
                to="/products"
                className="text-sm font-medium text-text-secondary hover:text-primary-500 transition-colors duration-200 tracking-wide"
              >
                Products
              </Link>
            )}
            {user?.role !== 'admin' && (
              <Link
                to="/contact"
                className="text-sm font-medium text-text-secondary hover:text-primary-500 transition-colors duration-200 tracking-wide"
              >
                Contact
              </Link>
            )}

            {user?.role === 'vendor' && (
              <Link
                to="/dashboard/vendor/pricing"
                className="text-sm font-medium text-text-secondary hover:text-primary-500 transition-colors duration-200 tracking-wide"
              >
                Pricing
              </Link>
            )}

            {!user && (
              <Link
                to="/register?role=vendor"
                className="text-sm font-semibold bg-primary-500 text-white px-5 py-2.5 rounded-lg hover:bg-primary-600 hover:shadow-neon-red transform hover:scale-105 transition-all duration-300"
              >
                Sell on AutoSphere
              </Link>
            )}

            {user ? (
              <>
                {/* Chat Notification Badge - For all logged-in users */}
                <ChatNotificationBadge />

                {user.role === 'customer' && (
                  <>
                    <Link
                      to="/wishlist"
                      className="text-sm font-medium text-text-secondary hover:text-primary-500 transition-colors duration-200 relative group"
                    >
                      <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {wishlistCount > 0 && (
                        <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-neon-red animate-pulse">
                          {wishlistCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      to="/cart"
                      className="text-sm font-medium text-text-secondary hover:text-primary-500 transition-colors duration-200 relative group"
                    >
                      <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {getCartCount() > 0 && (
                        <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-neon-red animate-pulse">
                          {getCartCount()}
                        </span>
                      )}
                    </Link>
                  </>
                )}

                <Link
                  to={getDashboardLink()}
                  className="text-sm font-medium text-text-secondary hover:text-primary-500 transition-colors duration-200 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="tracking-wide">Dashboard</span>
                </Link>

                <div className="flex items-center space-x-4 pl-6 border-l border-surface-light">
                  {/* User Menu with Dropdown */}
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-surface-light transition-all duration-200"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-800 to-primary-700 flex items-center justify-center shadow-neon-red overflow-hidden">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={user.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={() => setAvatarError(true)}
                          />
                        ) : (
                          <span className="text-sm font-bold text-white">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="hidden md:block text-left">
                        <p className="text-sm font-semibold text-text-primary">{user.name}</p>
                        <p className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor()} inline-block mt-0.5`}>
                          {user.role}
                        </p>
                      </div>
                      <svg className={`w-4 h-4 text-text-tertiary transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-surface border border-surface-light rounded-xl shadow-lg shadow-black/20 py-2 z-50 animate-fadeIn">
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-surface-light">
                          <p className="text-sm font-semibold text-text-primary truncate">{user.name}</p>
                          <p className="text-xs text-text-secondary truncate">{user.email}</p>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          <Link
                            to={getSettingsLink()}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Account Settings
                          </Link>

                          <Link
                            to={getDashboardLink()}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Dashboard
                          </Link>
                        </div>

                        {/* Logout */}
                        <div className="border-t border-surface-light pt-2">
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              handleLogout();
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-sm font-medium text-text-secondary hover:text-primary-500 transition-colors duration-200 tracking-wide"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-sm px-5 py-2.5"
                >
                  Get Started
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-3">
            {user?.role === 'customer' && (
              <>
                <Link to="/wishlist" className="relative">
                  <svg className="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {wishlistCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
                <Link to="/cart" className="relative">
                  <svg className="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {getCartCount() > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary-700 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {getCartCount()}
                    </span>
                  )}
                </Link>
              </>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-10 h-10 flex items-center justify-center text-text-primary hover:text-primary-500 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-surface-light py-4 space-y-3 animate-slide-in">
            {user?.role !== 'vendor' && user?.role !== 'admin' && (
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-text-secondary hover:text-primary-500 hover:bg-surface-light rounded-lg transition-all"
              >
                Products
              </Link>
            )}
            {user?.role !== 'admin' && (
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-text-secondary hover:text-primary-500 hover:bg-surface-light rounded-lg transition-all"
              >
                Contact
              </Link>
            )}

            {user?.role === 'vendor' && (
              <Link
                to="/dashboard/vendor/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-text-secondary hover:text-primary-500 hover:bg-surface-light rounded-lg transition-all"
              >
                Pricing
              </Link>
            )}

            {user ? (
              <>
                {/* User Profile Section */}
                <div className="px-4 py-3 mb-2 bg-surface-light/50 rounded-lg mx-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-800 to-primary-700 flex items-center justify-center overflow-hidden">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={user.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        <span className="text-white font-bold text-lg">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{user.name}</p>
                      <p className="text-xs text-text-secondary truncate">{user.email}</p>
                      <p className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor()} inline-block mt-1`}>
                        {user.role}
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  to={getSettingsLink()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-text-secondary hover:text-primary-500 hover:bg-surface-light rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Account Settings
                </Link>

                <Link
                  to={getDashboardLink()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-text-secondary hover:text-primary-500 hover:bg-surface-light rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </Link>

                <div className="border-t border-surface-light mt-2 pt-2">
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-text-secondary hover:text-primary-500 hover:bg-surface-light rounded-lg transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block mx-4 px-4 py-2.5 bg-gradient-to-r from-primary-800 to-primary-700 text-white text-center rounded-lg font-semibold"
                >
                  Get Started
                </Link>
                <Link
                  to="/register?role=vendor"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-text-secondary hover:text-primary-500 hover:bg-surface-light rounded-lg transition-all"
                >
                  Sell on AutoSphere
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
