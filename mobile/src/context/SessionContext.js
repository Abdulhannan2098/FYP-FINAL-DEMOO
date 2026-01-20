import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';

const SessionContext = createContext();

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};

export const SessionProvider = ({ children }) => {
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeUntilTimeout, setTimeUntilTimeout] = useState(null);

  const { isAuthenticated, logout } = useAuth();
  const inactivityTimeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // Configuration (in milliseconds)
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const WARNING_TIME = 2 * 60 * 1000; // Show warning 2 minutes before timeout

  // Update last activity time
  const updateActivity = useCallback(() => {
    setLastActivityTime(Date.now());
    setShowTimeoutWarning(false);
  }, []);

  // Reset inactivity timer when a fresh session starts (login/register)
  useEffect(() => {
    if (isAuthenticated) {
      updateActivity();
    }
  }, [isAuthenticated, updateActivity]);

  // Check for inactivity
  useEffect(() => {
    if (!isAuthenticated) {
      clearTimeouts();
      return;
    }

    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityTime;
      const timeRemaining = INACTIVITY_TIMEOUT - timeSinceLastActivity;

      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        // Timeout reached - logout
        console.log('⏰ Session timeout - logging out');
        handleTimeout();
      } else if (timeRemaining <= WARNING_TIME && !showTimeoutWarning) {
        // Show warning
        console.log('⚠️ Session timeout warning');
        setShowTimeoutWarning(true);
        setTimeUntilTimeout(Math.ceil(timeRemaining / 1000));
      } else if (timeRemaining > WARNING_TIME && showTimeoutWarning) {
        // Hide warning if user became active
        setShowTimeoutWarning(false);
      }
    };

    // Check every 10 seconds
    const intervalId = setInterval(checkInactivity, 10000);

    // Also set specific timeouts
    const timeUntilWarning = INACTIVITY_TIMEOUT - WARNING_TIME - (Date.now() - lastActivityTime);
    const timeUntilLogout = INACTIVITY_TIMEOUT - (Date.now() - lastActivityTime);

    if (timeUntilWarning > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        setShowTimeoutWarning(true);
        setTimeUntilTimeout(Math.ceil(WARNING_TIME / 1000));
      }, timeUntilWarning);
    }

    if (timeUntilLogout > 0) {
      inactivityTimeoutRef.current = setTimeout(() => {
        handleTimeout();
      }, timeUntilLogout);
    }

    return () => {
      clearInterval(intervalId);
      clearTimeouts();
    };
  }, [isAuthenticated, lastActivityTime, showTimeoutWarning]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground - update activity
        console.log('📱 App came to foreground - resetting activity timer');
        updateActivity();
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [updateActivity]);

  // Countdown timer for warning
  useEffect(() => {
    if (showTimeoutWarning && timeUntilTimeout > 0) {
      const countdownInterval = setInterval(() => {
        setTimeUntilTimeout((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [showTimeoutWarning, timeUntilTimeout]);

  const clearTimeouts = () => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  };

  const handleTimeout = async () => {
    setShowTimeoutWarning(false);
    clearTimeouts();
    await logout();
    // You can show a toast or alert here to inform the user
    console.log('Session expired due to inactivity');
  };

  const extendSession = () => {
    updateActivity();
    setShowTimeoutWarning(false);
  };

  const value = {
    lastActivityTime,
    showTimeoutWarning,
    timeUntilTimeout,
    updateActivity,
    extendSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};
