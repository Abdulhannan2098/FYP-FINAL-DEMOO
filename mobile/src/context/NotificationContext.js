import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Show notification
  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now().toString();
    const notification = {
      id,
      message,
      type, // 'success', 'error', 'warning', 'info'
      duration,
      timestamp: new Date(),
    };

    setNotifications((prev) => [...prev, notification]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Helper methods for different notification types
  const showSuccess = useCallback(
    (message, duration) => showNotification(message, 'success', duration),
    [showNotification]
  );

  const showError = useCallback(
    (message, duration) => showNotification(message, 'error', duration),
    [showNotification]
  );

  const showWarning = useCallback(
    (message, duration) => showNotification(message, 'warning', duration),
    [showNotification]
  );

  const showInfo = useCallback(
    (message, duration) => showNotification(message, 'info', duration),
    [showNotification]
  );

  const value = {
    notifications,
    showNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
