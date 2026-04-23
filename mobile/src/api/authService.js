import apiClient from './client';
import { ENDPOINTS } from './config';

/**
 * Authentication API Service
 */
export const authService = {
  /**
   * Register a new user
   * @param {Object} userData - { name, email, password, role, phone, address }
   * @returns {Promise} API response (may require email verification)
   */
  register: async (userData) => {
    const response = await apiClient.post(ENDPOINTS.REGISTER, userData);
    return response.data;
  },

  /**
   * Login user
   * @param {Object} credentials - { email, password }
   * @returns {Promise} User data and token
   */
  login: async (credentials) => {
    const normalizedEmail = (credentials?.email ?? '').toString().trim().toLowerCase();
    // Mobile-only testing bypass: opt in via header for the seeded vendor login.
    // Kept scoped to a single known vendor email to avoid affecting other users.
    const shouldBypassVendorVerification = normalizedEmail === 'ali.hammad@autosphere.pk';

    const response = await apiClient.post(
      ENDPOINTS.LOGIN,
      credentials,
      shouldBypassVendorVerification
        ? { headers: { 'X-Mobile-Test-Login': 'true' } }
        : undefined
    );
    return response.data;
  },

  /**
   * Get current user profile
   * @returns {Promise} User profile data
   */
  getMe: async () => {
    const response = await apiClient.get(ENDPOINTS.GET_ME);
    return response.data;
  },

  /**
   * Forgot password - Send OTP
   * @param {string} email
   * @returns {Promise}
   */
  forgotPassword: async (email) => {
    const response = await apiClient.post(ENDPOINTS.FORGOT_PASSWORD, { email });
    return response.data;
  },

  /**
   * Verify OTP
   * @param {Object} data - { email, otp }
   * @returns {Promise}
   */
  verifyOTP: async (data) => {
    const response = await apiClient.post(ENDPOINTS.VERIFY_OTP, data);
    return response.data;
  },

  /**
   * Verify email with OTP (post-registration)
   * @param {Object} data - { email, otp }
   * @returns {Promise}
   */
  verifyEmail: async (data) => {
    const response = await apiClient.post(ENDPOINTS.VERIFY_EMAIL, data);
    return response.data;
  },

  /**
   * Verify vendor email with OTP
   * @param {Object} data - { email, otp }
   * @returns {Promise}
   */
  verifyVendorEmail: async (data) => {
    const response = await apiClient.post(ENDPOINTS.VERIFY_VENDOR_EMAIL, data);
    return response.data;
  },

  /**
   * Send vendor pre-registration email OTP
   * @param {Object} data - { email, name }
   * @returns {Promise}
   */
  sendVendorPreRegEmailOTP: async (data) => {
    const response = await apiClient.post(ENDPOINTS.VENDOR_PRE_REGISTER_SEND_EMAIL_OTP, data);
    return response.data;
  },

  /**
   * Send vendor pre-registration phone OTP
   * @param {Object} data - { phone, name }
   * @returns {Promise}
   */
  sendVendorPreRegPhoneOTP: async (data) => {
    const response = await apiClient.post(ENDPOINTS.VENDOR_PRE_REGISTER_SEND_PHONE_OTP, data);
    return response.data;
  },

  /**
   * Verify vendor pre-registration email OTP
   * @param {Object} data - { email, otp }
   * @returns {Promise}
   */
  verifyVendorPreRegEmailOTP: async (data) => {
    const response = await apiClient.post(ENDPOINTS.VENDOR_PRE_REGISTER_VERIFY_EMAIL_OTP, data);
    return response.data;
  },

  /**
   * Verify vendor pre-registration phone OTP
   * @param {Object} data - { phone, otp }
   * @returns {Promise}
   */
  verifyVendorPreRegPhoneOTP: async (data) => {
    const response = await apiClient.post(ENDPOINTS.VENDOR_PRE_REGISTER_VERIFY_PHONE_OTP, data);
    return response.data;
  },

  /**
   * Check vendor pre-registration verification state
   * @param {Object} data - { email, phone }
   * @returns {Promise}
   */
  checkVendorPreRegVerification: async (data) => {
    const response = await apiClient.post(ENDPOINTS.VENDOR_PRE_REGISTER_CHECK_VERIFICATION, data);
    return response.data;
  },

  /**
   * Verify vendor phone OTP
   * @param {Object} data - { email, otp }
   * @returns {Promise}
   */
  verifyPhone: async (data) => {
    const response = await apiClient.post(ENDPOINTS.VERIFY_PHONE, data);
    return response.data;
  },

  /**
   * Resend verification OTP
   * @param {string} email
   * @returns {Promise}
   */
  resendVerificationOTP: async (email) => {
    const response = await apiClient.post(ENDPOINTS.RESEND_VERIFICATION_OTP, { email });
    return response.data;
  },

  /**
   * Resend vendor phone OTP
   * @param {string} email
   * @returns {Promise}
   */
  resendPhoneOTP: async (email) => {
    const response = await apiClient.post(ENDPOINTS.RESEND_PHONE_OTP, { email });
    return response.data;
  },

  /**
   * Register a new vendor after pre-verification
   * @param {Object} vendorData
   * @returns {Promise}
   */
  registerVendor: async (vendorData) => {
    const response = await apiClient.post(ENDPOINTS.VENDOR_REGISTER, vendorData);
    return response.data;
  },

  /**
   * Reset password
   * @param {string} resetToken
   * @param {string} newPassword
   * @returns {Promise}
   */
  resetPassword: async (resetToken, newPassword) => {
    const response = await apiClient.put(
      ENDPOINTS.RESET_PASSWORD.replace(':resetToken', resetToken),
      { password: newPassword }
    );
    return response.data;
  },

  /**
   * Update user profile
   * @param {Object} profileData - { name, phone, address, profileImage }
   * @returns {Promise}
   */
  updateProfile: async (profileData) => {
    const response = await apiClient.put(ENDPOINTS.UPDATE_PROFILE, profileData);
    return response.data;
  },

  /**
   * Change password
   * @param {Object} data - { currentPassword, newPassword }
   * @returns {Promise}
   */
  changePassword: async (data) => {
    const response = await apiClient.put(ENDPOINTS.CHANGE_PASSWORD, data);
    return response.data;
  },
};
