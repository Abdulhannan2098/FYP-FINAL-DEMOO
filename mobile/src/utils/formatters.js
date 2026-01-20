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
  const statusMap = {
    'Pending Vendor Action': 'Pending',
    'Accepted': 'Accepted',
    'Rejected': 'Rejected',
    'In Progress': 'In Progress',
    'Shipped': 'Shipped',
    'Completed': 'Completed',
    'Cancelled': 'Cancelled',
  };
  return statusMap[status] || status;
};

/**
 * Get status color based on order status
 * @param {string} status - Order status
 * @returns {string} Color code
 */
export const getStatusColor = (status) => {
  const colorMap = {
    'Pending Vendor Action': '#FFA500',
    'Accepted': '#4CAF50',
    'Rejected': '#F44336',
    'In Progress': '#2196F3',
    'Shipped': '#9C27B0',
    'Completed': '#4CAF50',
    'Cancelled': '#757575',
  };
  return colorMap[status] || '#757575';
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
  if (!password || password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters' };
  }
  return { isValid: true, message: 'Password is valid' };
};
