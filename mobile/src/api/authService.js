import apiClient from './client';
import { ENDPOINTS } from './config';

/**
 * Authentication API Service
 */
export const authService = {
  /**
   * Register a new user
   * @param {Object} userData - { name, email, password, role, phone, address }
   * @returns {Promise} User data and token
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
    const response = await apiClient.post(ENDPOINTS.LOGIN, credentials);
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
