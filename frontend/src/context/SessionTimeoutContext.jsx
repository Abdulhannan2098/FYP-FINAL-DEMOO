import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import api from '../services/api';

const SessionTimeoutContext = createContext();

export const useSessionTimeout = () => {
  const context = useContext(SessionTimeoutContext);
  if (!context) {
    throw new Error('useSessionTimeout must be used within SessionTimeoutProvider');
  }
  return context;
};

export const SessionTimeoutProvider = ({ children }) => {
  const { user, logout: authLogout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isActive, setIsActive] = useState(true);

  const warningThreshold = 5; // Show warning when 5 minutes remaining
  const checkInterval = 60000; // Check every minute
  const activityUpdateInterval = 300000; // Update activity every 5 minutes

  const timerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const activityTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Track user activity
  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

  const updateActivity = useCallback(async () => {
    if (!user) return;

    try {
      await api.post('/sessions/activity');
      lastActivityRef.current = Date.now();
      setIsActive(true);
      setShowWarning(false);
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  }, [user]);

  const checkSessionStatus = useCallback(async () => {
    if (!user) return;

    try {
      const response = await api.get('/sessions/status');
      const { timeRemaining: remaining } = response.data.data;

      setTimeRemaining(remaining);

      // Show warning if less than threshold
      if (remaining.minutes < warningThreshold && remaining.minutes >= 0) {
        setShowWarning(true);
      }

      // Session expired
      if (remaining.total <= 0) {
        handleSessionExpired();
      }
    } catch (error) {
      if (error.response?.data?.code === 'SESSION_TIMEOUT') {
        handleSessionExpired();
      }
    }
  }, [user]);

  const handleSessionExpired = useCallback(() => {
    setShowWarning(false);
    showToast('Your session has expired due to inactivity. Please login again.', 'warning');
    authLogout();
    navigate('/login');
  }, [authLogout, navigate, showToast]);

  const handleExtendSession = useCallback(async () => {
    await updateActivity();
    setShowWarning(false);
    showToast('Session extended successfully', 'success');
  }, [updateActivity, showToast]);

  const handleLogout = useCallback(() => {
    setShowWarning(false);
    authLogout();
    navigate('/login');
  }, [authLogout, navigate]);

  // Activity listener
  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;

      // Only update if more than 1 minute since last activity
      if (timeSinceLastActivity > 60000) {
        updateActivity();
      }
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, updateActivity]);

  // Periodic activity update
  useEffect(() => {
    if (!user) return;

    activityTimerRef.current = setInterval(() => {
      updateActivity();
    }, activityUpdateInterval);

    return () => {
      if (activityTimerRef.current) {
        clearInterval(activityTimerRef.current);
      }
    };
  }, [user, updateActivity]);

  // Session status check
  useEffect(() => {
    if (!user) return;

    // Initial check
    checkSessionStatus();

    // Periodic check
    timerRef.current = setInterval(() => {
      checkSessionStatus();
    }, checkInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user, checkSessionStatus]);

  // Warning countdown
  useEffect(() => {
    if (!showWarning || !timeRemaining) return;

    warningTimerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (!prev) return null;

        const newTotal = Math.max(0, prev.total - 1000);
        const newMinutes = Math.floor(newTotal / 60000);
        const newSeconds = Math.floor((newTotal % 60000) / 1000);

        if (newTotal <= 0) {
          handleSessionExpired();
          return null;
        }

        return {
          total: newTotal,
          minutes: newMinutes,
          seconds: newSeconds,
        };
      });
    }, 1000);

    return () => {
      if (warningTimerRef.current) {
        clearInterval(warningTimerRef.current);
      }
    };
  }, [showWarning, handleSessionExpired]);

  const value = {
    showWarning,
    timeRemaining,
    isActive,
    handleExtendSession,
    handleLogout,
  };

  return (
    <SessionTimeoutContext.Provider value={value}>
      {children}
      {showWarning && user && (
        <SessionTimeoutModal
          timeRemaining={timeRemaining}
          onExtend={handleExtendSession}
          onLogout={handleLogout}
        />
      )}
    </SessionTimeoutContext.Provider>
  );
};

// Session Timeout Warning Modal
const SessionTimeoutModal = ({ timeRemaining, onExtend, onLogout }) => {
  if (!timeRemaining) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl border border-primary-500/30 p-8 max-w-md w-full mx-4 animate-scale-in">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-primary-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="heading-2 text-center mb-2">Session Expiring Soon</h2>
        <p className="text-body text-center mb-6">
          You'll be logged out due to inactivity in:
        </p>

        {/* Countdown */}
        <div className="bg-secondary-800 rounded-xl p-6 mb-6 text-center">
          <div className="text-5xl font-bold text-primary-400 font-mono">
            {timeRemaining.minutes}:{String(timeRemaining.seconds).padStart(2, '0')}
          </div>
          <div className="text-sm text-text-tertiary mt-2">minutes remaining</div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onExtend}
            className="w-full btn-primary"
          >
            Continue Session
          </button>
          <button
            onClick={onLogout}
            className="w-full btn-outline"
          >
            Logout Now
          </button>
        </div>

        {/* Info */}
        <p className="text-xs text-text-tertiary text-center mt-4">
          Click "Continue Session" to remain logged in
        </p>
      </div>
    </div>
  );
};

export default SessionTimeoutContext;
