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
    const { user: newUser, token } = response.data;

    await saveToken(token);
    await saveUser(newUser); // saveUser handles stringification internally
    setUser(newUser);
    setIsAuthenticated(true);

    return newUser;
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
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
