/**
 * Utility functions for formatting data
 */

/**
 * Format price to currency string
 * @param {number} price - Price value
 * @param {string} currency - Legacy argument (ignored; PKR enforced)
 * @returns {string} Formatted price
 */
export const formatPKR = (value) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 'PKR 0.00';

  try {
    const formatted = numberValue.toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `PKR ${formatted}`;
  } catch {
    return `PKR ${numberValue.toFixed(2)}`;
  }
};

export const formatPrice = (price, currency = 'PKR') => {
  return formatPKR(price);
};

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format date with time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date with time
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format order status to display text
 * @param {string} status - Order status
 * @returns {string} Formatted status
 */
export const formatOrderStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  const statusMap = {
    'Pending Vendor Action': 'Pending Vendor Action',
    'In Progress': 'In Progress',
    'Shipped': 'Shipped',
    'Delivered': 'Delivered',
    'Cancelled': 'Cancelled',
    pending: 'Pending Vendor Action',
    accepted: 'In Progress',
    rejected: 'Cancelled',
    completed: 'Delivered',
  };
  return statusMap[status] || statusMap[normalized] || status;
};

/**
 * Get status color based on order status
 * @param {string} status - Order status
 * @returns {string} Color code
 */
export const getStatusColor = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  const colorMap = {
    'Pending Vendor Action': '#FFA500',
    'In Progress': '#2196F3',
    'Shipped': '#9C27B0',
    'Delivered': '#4CAF50',
    'Cancelled': '#757575',
    pending: '#FFA500',
    accepted: '#2196F3',
    rejected: '#757575',
    completed: '#4CAF50',
  };
  return colorMap[status] || colorMap[normalized] || '#757575';
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Calculate cart total
 * @param {Array} cartItems - Cart items array
 * @returns {number} Total price
 */
export const calculateCartTotal = (cartItems) => {
  if (!cartItems || cartItems.length === 0) return 0;
  return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} { isValid: boolean, message: string }
 */
export const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }

  if (!passwordRegex.test(password)) {
    return {
      isValid: false,
      message:
        'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    };
  }
  return { isValid: true, message: 'Password is valid' };
};
