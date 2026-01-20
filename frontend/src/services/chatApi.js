import api from './api';

// ==================== CONVERSATION ENDPOINTS ====================

/**
 * Create or get existing conversation with a vendor about a product
 */
export const createOrGetConversation = async (productId, vendorId) => {
  const response = await api.post('/chat/conversations', {
    productId,
    vendorId
  });
  return response.data;
};

/**
 * Get all conversations for current user
 */
export const getMyConversations = async (params = {}) => {
  const { status = 'active', page = 1, limit = 20 } = params;
  const response = await api.get('/chat/conversations', {
    params: { status, page, limit }
  });
  return response.data;
};

/**
 * Get single conversation by ID
 */
export const getConversation = async (conversationId) => {
  const response = await api.get(`/chat/conversations/${conversationId}`);
  return response.data;
};

/**
 * Get messages for a conversation
 */
export const getMessages = async (conversationId, params = {}) => {
  const { page = 1, limit = 50 } = params;
  const response = await api.get(`/chat/conversations/${conversationId}/messages`, {
    params: { page, limit }
  });
  return response.data;
};

/**
 * Archive a conversation
 */
export const archiveConversation = async (conversationId) => {
  const response = await api.put(`/chat/conversations/${conversationId}/archive`);
  return response.data;
};

/**
 * Block a conversation (Admin only)
 */
export const blockConversation = async (conversationId, reason) => {
  const response = await api.put(`/chat/conversations/${conversationId}/block`, {
    reason
  });
  return response.data;
};

/**
 * Unblock a conversation (Admin only)
 */
export const unblockConversation = async (conversationId) => {
  const response = await api.put(`/chat/conversations/${conversationId}/unblock`);
  return response.data;
};

/**
 * Delete a conversation (All participants)
 */
export const deleteConversation = async (conversationId) => {
  const response = await api.delete(`/chat/conversations/${conversationId}`);
  return response.data;
};

// ==================== MESSAGE ENDPOINTS ====================

/**
 * Delete a message
 */
export const deleteMessage = async (messageId) => {
  const response = await api.delete(`/chat/messages/${messageId}`);
  return response.data;
};

// ==================== NOTIFICATION ENDPOINTS ====================

/**
 * Get notifications for current user
 */
export const getNotifications = async (params = {}) => {
  const { unreadOnly = false, page = 1, limit = 20 } = params;
  const response = await api.get('/chat/notifications', {
    params: { unreadOnly, page, limit }
  });
  return response.data;
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  const response = await api.put(`/chat/notifications/${notificationId}/read`);
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async () => {
  const response = await api.put('/chat/notifications/read-all');
  return response.data;
};

// ==================== STATS ENDPOINTS (Admin) ====================

/**
 * Get chat statistics (Admin only)
 */
export const getChatStats = async () => {
  const response = await api.get('/chat/stats');
  return response.data;
};

// Export all functions
export default {
  createOrGetConversation,
  getMyConversations,
  getConversation,
  getMessages,
  archiveConversation,
  blockConversation,
  unblockConversation,
  deleteConversation,
  deleteMessage,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getChatStats
};
