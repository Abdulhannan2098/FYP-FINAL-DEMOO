import apiClient from './client';
import { ENDPOINTS } from './config';

/**
 * Chat API Service
 * Provides REST API methods for chat functionality
 * Real-time features use Socket.IO (see socketService.js)
 */

// ==================== Conversation APIs ====================

/**
 * Get all conversations for current user
 * @param {Object} params - Query parameters (status, page, limit)
 * @returns {Promise} Conversations array
 */
export const getConversations = async (params = {}) => {
  const response = await apiClient.get(ENDPOINTS.CONVERSATIONS, { params });
  return response.data;
};

/**
 * Get single conversation by ID
 * @param {string} conversationId
 * @returns {Promise} Conversation object
 */
export const getConversation = async (conversationId) => {
  const response = await apiClient.get(`${ENDPOINTS.CONVERSATIONS}/${conversationId}`);
  return response.data;
};

/**
 * Create or get existing conversation
 * @param {Object} data - { productId, vendorId }
 * @returns {Promise} Conversation object
 */
export const createConversation = async (data) => {
  const response = await apiClient.post(ENDPOINTS.CONVERSATIONS, data);
  return response.data;
};

/**
 * Archive a conversation
 * @param {string} conversationId
 * @returns {Promise}
 */
export const archiveConversation = async (conversationId) => {
  const response = await apiClient.put(`${ENDPOINTS.CONVERSATIONS}/${conversationId}/archive`);
  return response.data;
};

/**
 * Delete a conversation
 * @param {string} conversationId
 * @returns {Promise}
 */
export const deleteConversation = async (conversationId) => {
  const response = await apiClient.delete(`${ENDPOINTS.CONVERSATIONS}/${conversationId}`);
  return response.data;
};

/**
 * Block a conversation (admin only)
 * @param {string} conversationId
 * @param {string} reason
 * @returns {Promise}
 */
export const blockConversation = async (conversationId, reason) => {
  const response = await apiClient.put(
    `${ENDPOINTS.CONVERSATIONS}/${conversationId}/block`,
    { reason }
  );
  return response.data;
};

/**
 * Unblock a conversation (admin only)
 * @param {string} conversationId
 * @returns {Promise}
 */
export const unblockConversation = async (conversationId) => {
  const response = await apiClient.put(`${ENDPOINTS.CONVERSATIONS}/${conversationId}/unblock`);
  return response.data;
};

// ==================== Message APIs ====================

/**
 * Get messages for a conversation
 * @param {string} conversationId
 * @param {Object} params - Query parameters (page, limit)
 * @returns {Promise} Messages array
 */
export const getMessages = async (conversationId, params = {}) => {
  const response = await apiClient.get(ENDPOINTS.MESSAGES(conversationId), { params });
  return response.data;
};

/**
 * Send a message (REST API - use Socket.IO for real-time)
 * @param {string} conversationId
 * @param {Object} messageData - { text, type }
 * @returns {Promise} Sent message
 */
export const sendMessage = async (conversationId, messageData) => {
  const response = await apiClient.post(ENDPOINTS.SEND_MESSAGE(conversationId), messageData);
  return response.data;
};

/**
 * Upload message with file
 * @param {Object} data - FormData with file, conversationId, text
 * @returns {Promise} Message with file
 */
export const uploadMessageFile = async (data) => {
  const response = await apiClient.post('/chat/messages/upload', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Delete a message
 * @param {string} messageId
 * @returns {Promise}
 */
export const deleteMessage = async (messageId) => {
  const response = await apiClient.delete(`/chat/messages/${messageId}`);
  return response.data;
};

// ==================== Notification APIs ====================

/**
 * Get user notifications
 * @returns {Promise} Notifications array
 */
export const getNotifications = async () => {
  const response = await apiClient.get('/chat/notifications');
  return response.data;
};

/**
 * Mark notification as read
 * @param {string} notificationId
 * @returns {Promise}
 */
export const markNotificationRead = async (notificationId) => {
  const response = await apiClient.put(`/chat/notifications/${notificationId}/read`);
  return response.data;
};

/**
 * Mark all notifications as read
 * @returns {Promise}
 */
export const markAllNotificationsRead = async () => {
  const response = await apiClient.put('/chat/notifications/read-all');
  return response.data;
};

// ==================== Chat Statistics (Admin) ====================

/**
 * Get chat statistics (admin only)
 * @returns {Promise} Statistics object
 */
export const getChatStats = async () => {
  const response = await apiClient.get('/chat/stats');
  return response.data;
};

// Export all as named exports and default
export default {
  getConversations,
  getConversation,
  createConversation,
  archiveConversation,
  deleteConversation,
  blockConversation,
  unblockConversation,
  getMessages,
  sendMessage,
  uploadMessageFile,
  deleteMessage,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getChatStats,
};
