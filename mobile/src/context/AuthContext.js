import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authService } from '../api/authService';
import { saveToken, getToken, saveUser, getUser, clearAllData } from '../utils/storage';
import { setGlobalLogoutHandler } from '../api/client';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthStatus();

    // Register global logout handler for 401 errors
    setGlobalLogoutHandler(() => {
      logout();
    });
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await getToken();
      const storedUser = await getUser();

      if (token && storedUser) {
        // Validate the token by making a test API call
        // This ensures we don't set isAuthenticated with an expired token
        try {
          const response = await authService.getMe();
          if (response.success && response.data) {
            // Token is valid, use fresh data from server
            await saveUser(response.data);
            setUser(response.data);
            setIsAuthenticated(true);
          } else {
            // Token validation failed, clear auth state
            await clearAllData();
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (validationError) {
          // Token is expired or invalid, clear auth state silently
          // This prevents the session timeout error from appearing on launch
          console.log('Session expired, clearing auth state');
          await clearAllData();
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await authService.login({ email, password });
    const { user: userData, token } = response.data;

    await saveToken(token);
    await saveUser(userData); // saveUser handles stringification internally
    setUser(userData);
    setIsAuthenticated(true);

    return userData;
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    const data = response?.data;

    // Web parity: registration returns requiresVerification and no token
    if (data?.requiresVerification) {
      return {
        requiresVerification: true,
        email: data.email,
        role: userData?.role || 'customer',
        phone: userData?.phone,
      };
    }

    // Legacy/compat: if backend ever returns token + user
    const token = data?.token;
    const newUser = data?.user;
    if (token && newUser) {
      await saveToken(token);
      await saveUser(newUser);
      setUser(newUser);
      setIsAuthenticated(true);
      return newUser;
    }

    throw new Error(response?.message || 'Registration failed');
  };

  const registerVendor = async (vendorData) => {
    const response = await authService.registerVendor(vendorData);
    const data = response?.data;
    const token = response?.token || data?.token;
    const newUser = response?.user || data?.user;

    if (!token || !newUser) {
      throw new Error(response?.message || 'Vendor registration failed');
    }

    await saveToken(token);
    await saveUser(newUser);
    setUser(newUser);
    setIsAuthenticated(true);

    return newUser;
  };

  const sendVendorPreRegEmailOTP = async (email, name) => {
    return await authService.sendVendorPreRegEmailOTP({ email, name });
  };

  const sendVendorPreRegPhoneOTP = async (phone, name) => {
    return await authService.sendVendorPreRegPhoneOTP({ phone, name });
  };

  const verifyVendorPreRegEmailOTP = async (email, otp) => {
    return await authService.verifyVendorPreRegEmailOTP({ email, otp });
  };

  const verifyVendorPreRegPhoneOTP = async (phone, otp) => {
    return await authService.verifyVendorPreRegPhoneOTP({ phone, otp });
  };

  const checkVendorPreRegVerification = async (email, phone) => {
    return await authService.checkVendorPreRegVerification({ email, phone });
  };

  const verifyEmail = async (email, otp, options = {}) => {
    const { isVendor = false } = options;
    const response = isVendor
      ? await authService.verifyVendorEmail({ email, otp })
      : await authService.verifyEmail({ email, otp });
    const data = response?.data;
    const token = data?.token;
    const verifiedUser = data?.user;

    if (isVendor && data?.nextStep === 'VERIFY_PHONE') {
      return {
        requiresPhoneVerification: true,
        email: data.email || verifiedUser?.email || email,
        phone: data.phone || verifiedUser?.phone,
        user: verifiedUser,
      };
    }

    if (!token || !verifiedUser) {
      throw new Error(response?.message || 'Email verification failed');
    }

    if (verifiedUser.role === 'vendor' && !verifiedUser.phoneVerified) {
      return {
        requiresPhoneVerification: true,
        email: verifiedUser.email,
        phone: verifiedUser.phone,
        user: verifiedUser,
      };
    }

    await saveToken(token);
    await saveUser(verifiedUser);
    setUser(verifiedUser);
    setIsAuthenticated(true);
    return verifiedUser;
  };

  const verifyPhone = async (email, otp) => {
    const response = await authService.verifyPhone({ email, otp });
    const data = response?.data;
    const token = data?.token;
    const verifiedUser = data?.user;

    if (!token || !verifiedUser) {
      throw new Error(response?.message || 'Phone verification failed');
    }

    await saveToken(token);
    await saveUser(verifiedUser);
    setUser(verifiedUser);
    setIsAuthenticated(true);
    return verifiedUser;
  };

  const resendVerificationOTP = async (email) => {
    return await authService.resendVerificationOTP(email);
  };

  const resendPhoneOTP = async (email) => {
    return await authService.resendPhoneOTP(email);
  };

  const logout = async () => {
    try {
      // Clear all stored data
      await clearAllData();

      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Update user state and persist to storage
  const updateUser = useCallback(async (updatedUser) => {
    try {
      await saveUser(updatedUser); // saveUser handles stringification internally
      setUser(updatedUser);
    } catch (error) {
      console.error('Update user error:', error);
    }
  }, []);

  // Refresh user data from the server
  const refreshUser = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return null;

      const response = await authService.getMe();
      if (response.success && response.data) {
        const freshUserData = response.data;
        await saveUser(freshUserData);
        setUser(freshUserData);
        return freshUserData;
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
    return null;
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    registerVendor,
    verifyEmail,
    verifyPhone,
    resendVerificationOTP,
    resendPhoneOTP,
    sendVendorPreRegEmailOTP,
    sendVendorPreRegPhoneOTP,
    verifyVendorPreRegEmailOTP,
    verifyVendorPreRegPhoneOTP,
    checkVendorPreRegVerification,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
