// API Base URL - configured in app.json
// Using a simple approach to get the API URL
const getApiUrl = () => {
  try {
    // Try to import expo-constants and Platform dynamically
    const Constants = require('expo-constants').default;
    const { Platform } = require('react-native');

    // Preferred: configure via Expo public env var (works across networks without code changes)
    // Example (PowerShell): $env:EXPO_PUBLIC_API_URL = 'http://10.0.0.50:5000/api'
    // Example (cmd): set EXPO_PUBLIC_API_URL=http://10.0.0.50:5000/api
    if (process?.env?.EXPO_PUBLIC_API_URL) {
      return process.env.EXPO_PUBLIC_API_URL;
    }

    // For Android emulator, use 10.0.2.2 to access host machine
    // For iOS simulator and physical devices, use the LAN IP
    const isAndroidEmulator = Platform.OS === 'android' && !Constants.isDevice;

    // Prefer deriving host machine IP from Expo host URI when available
    // Example hostUri: "192.168.1.10:8081"
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoClient?.hostUri ||
      Constants.manifest?.debuggerHost;

    if (hostUri && typeof hostUri === 'string') {
      const host = hostUri.split(':')[0];
      if (host) {
        return `http://${host}:5000/api`;
      }
    }

    if (isAndroidEmulator) {
      // Android emulator - use special loopback IP
      return 'http://10.0.2.2:5000/api';
    } else {
      // Physical devices or iOS simulator - use config or LAN IP
      return Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000/api';
    }
  } catch (error) {
    // Fallback if expo-constants is not available
    return process?.env?.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
  }
};

export const API_BASE_URL = getApiUrl();

// API Endpoints
export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  GET_ME: '/auth/me',
  UPDATE_PROFILE: '/auth/profile',
  CHANGE_PASSWORD: '/auth/change-password',
  FORGOT_PASSWORD: '/auth/forgot-password',
  VERIFY_OTP: '/auth/verify-otp',
  VERIFY_EMAIL: '/auth/verify-email',
  VERIFY_VENDOR_EMAIL: '/vendor/verify-email',
  RESEND_VERIFICATION_OTP: '/auth/resend-verification-otp',
  VENDOR_PRE_REGISTER_SEND_EMAIL_OTP: '/vendor/pre-register/send-email-otp',
  VENDOR_PRE_REGISTER_SEND_PHONE_OTP: '/vendor/pre-register/send-phone-otp',
  VENDOR_PRE_REGISTER_VERIFY_EMAIL_OTP: '/vendor/pre-register/verify-email-otp',
  VENDOR_PRE_REGISTER_VERIFY_PHONE_OTP: '/vendor/pre-register/verify-phone-otp',
  VENDOR_PRE_REGISTER_CHECK_VERIFICATION: '/vendor/pre-register/check-verification',
  VERIFY_PHONE: '/vendor/verify-phone',
  RESEND_PHONE_OTP: '/vendor/resend-phone-otp',
  VENDOR_REGISTER: '/vendor/register',
  VENDOR_VERIFICATION_STATUS: '/vendor/verification-status',
  VENDOR_VERIFICATION_CNIC: '/vendor/verification/cnic',
  VENDOR_VERIFICATION_PROCESS: '/vendor/verification/process',
  VENDOR_VERIFICATION_RETRY: '/vendor/verification/retry',
  RESET_PASSWORD: '/auth/reset-password/:resetToken',

  // Products
  PRODUCTS: '/products',
  PRODUCT_BY_ID: (id) => `/products/${id}`,
  VENDOR_PRODUCTS: '/products/vendor/my-products',

  // Orders
  ORDERS: '/orders',
  ORDER_BY_ID: (id) => `/orders/${id}`,
  CUSTOMER_ORDERS: '/orders/user',
  VENDOR_ORDERS: '/orders/vendor',
  UPDATE_ORDER_STATUS: (id) => `/orders/${id}/status`,

  // Cart (local for now, will integrate with backend if available)
  // CART: '/cart',

  // Wishlist
  WISHLIST: '/wishlist',
  ADD_TO_WISHLIST: (productId) => `/wishlist/${productId}`,
  REMOVE_FROM_WISHLIST: (productId) => `/wishlist/${productId}`,

  // Chat
  CONVERSATIONS: '/chat/conversations',
  MESSAGES: (conversationId) => `/chat/conversations/${conversationId}/messages`,
  SEND_MESSAGE: (conversationId) => `/chat/conversations/${conversationId}/messages`,

  // Reviews
  REVIEWS: '/reviews',
  PRODUCT_REVIEWS: (productId) => `/reviews/product/${productId}`,
};

// Socket.IO URL (same as API but without /api)
export const SOCKET_URL = API_BASE_URL.replace('/api', '');

// Base URL for uploaded files (without /api)
export const getBaseUrl = () => API_BASE_URL.replace('/api', '');

// Helper function to get full image URL
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;

  // If it's already a full URL (http/https), return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // If it starts with /uploads, construct full URL
  if (imagePath.startsWith('/uploads')) {
    return `${getBaseUrl()}${imagePath}`;
  }

  // If it doesn't start with /, add it
  if (!imagePath.startsWith('/')) {
    return `${getBaseUrl()}/uploads/${imagePath}`;
  }

  return `${getBaseUrl()}${imagePath}`;
};
