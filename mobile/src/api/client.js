import axios from 'axios';
import { API_BASE_URL } from './config';
import { getToken, clearToken } from '../utils/storage';

// Global logout handler to be set by AuthContext
let globalLogoutHandler = null;

export const setGlobalLogoutHandler = (handler) => {
  globalLogoutHandler = handler;
};

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401) {
      await clearToken();
      console.log('Unauthorized - Token cleared');

      // Trigger global logout if handler is set
      if (globalLogoutHandler) {
        globalLogoutHandler();
      }
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network Error:', error.message);
      return Promise.reject({
        message: 'Network error. Please check your internet connection.',
      });
    }

    // Return error for handling in components
    const errorMessage = error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject({
      ...error.response?.data,
      message: errorMessage,
      statusCode: error.response?.status,
    });
  }
);

export default apiClient;
