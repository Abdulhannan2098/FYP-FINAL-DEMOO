const mongoose = require('mongoose');

const chatNotificationSchema = new mongoose.Schema({
  // Recipient
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Source
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },

  // Type
  type: {
    type: String,
    enum: [
      'new-message',
      'new-conversation',
      'message-read',
      'conversation-closed',
      'admin-warning',
      'system-announcement'
    ],
    required: true
  },

  // Content
  title: {
    type: String,
    required: true
  },
  body: String,

  // Status
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,

  // Action
  actionUrl: String,
  actionText: String
}, {
  timestamps: true
});

// Indexes
chatNotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
chatNotificationSchema.index({ conversation: 1 });

// Auto-delete old read notifications (cleanup after 30 days)
chatNotificationSchema.index(
  { createdAt: 1, read: 1 },
  { 
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
    partialFilterExpression: { read: true }
  }
);

// Static method to create notification
chatNotificationSchema.statics.createNotification = async function(data) {
  const { userId, conversationId, messageId, type, title, body, actionUrl } = data;
  
  return await this.create({
    user: userId,
    conversation: conversationId,
    message: messageId,
    type,
    title,
    body,
    actionUrl: actionUrl || `/chat/${conversationId}`,
    actionText: 'View'
  });
};

// Static method to mark all as read for a user
chatNotificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { user: userId, read: false },
    { read: true, readAt: new Date() }
  );
};

module.exports = mongoose.model('ChatNotification', chatNotificationSchema);
