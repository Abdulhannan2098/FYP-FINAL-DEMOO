const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { isVendorOrAdmin, isAdmin } = require('../middlewares/roleMiddleware');
const {
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
  getChatStats,
  uploadFileMessage,
  upload
} = require('../controllers/chatController');

// All routes require authentication
router.use(protect);

// ==================== CONVERSATION ROUTES ====================

// Create or get conversation
router.post('/conversations', createOrGetConversation);

// Get all conversations for current user
router.get('/conversations', getMyConversations);

// Get single conversation
router.get('/conversations/:id', getConversation);

// Get messages for a conversation
router.get('/conversations/:id/messages', getMessages);

// Archive conversation
router.put('/conversations/:id/archive', archiveConversation);

// Block conversation (Admin only)
router.put('/conversations/:id/block', isAdmin, blockConversation);

// Unblock conversation (Admin only)
router.put('/conversations/:id/unblock', isAdmin, unblockConversation);

// Delete conversation (All participants)
router.delete('/conversations/:id', deleteConversation);

// ==================== MESSAGE ROUTES ====================

// Upload file and send message
router.post('/messages/upload', upload.single('file'), uploadFileMessage);

// Delete message
router.delete('/messages/:id', deleteMessage);

// ==================== NOTIFICATION ROUTES ====================

// Get notifications
router.get('/notifications', getNotifications);

// Mark notification as read
router.put('/notifications/:id/read', markNotificationAsRead);

// Mark all notifications as read
router.put('/notifications/read-all', markAllNotificationsAsRead);

// ==================== STATS ROUTES (Admin) ====================

// Get chat statistics
router.get('/stats', isAdmin, getChatStats);

module.exports = router;
