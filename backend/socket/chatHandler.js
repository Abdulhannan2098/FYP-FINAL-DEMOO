const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const ChatNotification = require('../models/ChatNotification');
const { JWT_SECRET} = require('../config/env');

// Connected users map: userId -> socketId
const connectedUsers = new Map();

// Active typing users: conversationId -> Set<userId>
const typingUsers = new Map();

module.exports = (io) => {
  // ==================== AUTHENTICATION MIDDLEWARE ====================
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // ==================== CONNECTION EVENT ====================
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    const userRole = socket.user.role;
    
    console.log(`✅ User connected: ${socket.user.name} (${userRole}) [Socket ID: ${socket.id}]`);

    // Track connected user
    connectedUsers.set(userId, socket.id);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Emit online status to all users
    io.emit('user:online', {
      userId,
      role: userRole,
      name: socket.user.name
    });

    // Send online users list to the connected user
    socket.emit('users:online', Array.from(connectedUsers.keys()));

    // ==================== EVENT: Join conversation room ====================
    socket.on('conversation:join', async (conversationId) => {
      try {
        console.log(`🔵 ${socket.user.name} attempting to join conversation ${conversationId}`);
        
        // Verify user is part of conversation
        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }

        const isParticipant = conversation.participants.some(
          p => p.user.toString() === userId
        );

        const isAdmin = userRole === 'admin';

        if (!isParticipant && !isAdmin) {
          return socket.emit('error', { message: 'Unauthorized to join this conversation' });
        }

        // Join conversation room
        socket.join(`conversation:${conversationId}`);
        
        console.log(`📥 ${socket.user.name} joined conversation ${conversationId}`);

        // Update last read timestamp
        await Conversation.updateOne(
          {
            _id: conversationId,
            'participants.user': userId
          },
          {
            $set: { 'participants.$.lastReadAt': new Date() }
          }
        );

        socket.emit('conversation:joined', { conversationId });
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // ==================== EVENT: Leave conversation room ====================
    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`📤 ${socket.user.name} left conversation ${conversationId}`);
    });

    // ==================== EVENT: Send message ====================
    socket.on('message:send', async (data) => {
      try {
        const { conversationId, text, type = 'text', fileData } = data;

        console.log(`💬 ${socket.user.name} sending message to conversation ${conversationId}`);

        // Validate
        if (!text && type === 'text') {
          return socket.emit('error', { message: 'Message text is required' });
        }

        if (text && text.length > 5000) {
          return socket.emit('error', { message: 'Message too long (max 5000 characters)' });
        }

        // Verify conversation access
        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }

        const isParticipant = conversation.participants.some(
          p => p.user.toString() === userId
        );

        if (!isParticipant && userRole !== 'admin') {
          return socket.emit('error', { message: 'Unauthorized to send message' });
        }

        // Create message
        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          senderRole: userRole,
          content: {
            text: text?.trim(),
            type,
            ...fileData
          },
          metadata: {
            ipAddress: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent']
          }
        });

        // Populate sender
        await message.populate('sender', 'name email avatar role');

        // Emit to conversation room
        io.to(`conversation:${conversationId}`).emit('message:new', {
          message,
          conversationId
        });

        console.log(`✅ Message sent in conversation ${conversationId} by ${socket.user.name}`);

        // Send notifications to other participants
        const otherParticipants = conversation.participants.filter(
          p => p.user.toString() !== userId
        );

        for (const participant of otherParticipants) {
          const participantId = participant.user.toString();
          const isOnline = connectedUsers.has(participantId);

          // Create notification
          await ChatNotification.createNotification({
            userId: participantId,
            conversationId,
            messageId: message._id,
            type: 'new-message',
            title: `New message from ${socket.user.name}`,
            body: text?.substring(0, 100) || `[${type}]`,
            actionUrl: `/chat/${conversationId}`
          });

          // Emit real-time notification
          if (isOnline) {
            io.to(`user:${participantId}`).emit('notification:new', {
              type: 'new-message',
              conversation: conversationId,
              message: {
                id: message._id,
                text: text?.substring(0, 50),
                sender: {
                  id: userId,
                  name: socket.user.name,
                  avatar: socket.user.avatar
                }
              }
            });
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ==================== EVENT: Typing indicator start ====================
    socket.on('typing:start', (conversationId) => {
      // Add to typing users
      if (!typingUsers.has(conversationId)) {
        typingUsers.set(conversationId, new Set());
      }
      typingUsers.get(conversationId).add(userId);

      // Broadcast to others in conversation
      socket.to(`conversation:${conversationId}`).emit('user:typing', {
        userId,
        userName: socket.user.name,
        conversationId
      });

      console.log(`⌨️  ${socket.user.name} is typing in conversation ${conversationId}`);
    });

    // ==================== EVENT: Typing indicator stop ====================
    socket.on('typing:stop', (conversationId) => {
      // Remove from typing users
      if (typingUsers.has(conversationId)) {
        typingUsers.get(conversationId).delete(userId);
      }

      // Broadcast to others in conversation
      socket.to(`conversation:${conversationId}`).emit('user:stop-typing', {
        userId,
        conversationId
      });
    });

    // ==================== EVENT: Mark message as read ====================
    socket.on('message:read', async (data) => {
      try {
        const { messageId, conversationId } = data;

        const message = await Message.findById(messageId);

        if (!message) {
          // Silently ignore missing messages - they may have been deleted or don't exist
          console.log(`⚠️  Message ${messageId} not found, skipping read receipt`);
          return;
        }

        // Don't process read receipt if the reader is the sender
        const senderId = message.sender.toString();
        if (senderId === userId) {
          return;
        }

        // Mark as read
        await message.markAsRead(userId);

        // Emit to sender (so they see the blue double tick)
        io.to(`user:${senderId}`).emit('message:read-receipt', {
          messageId,
          conversationId,
          readBy: userId,
          readAt: new Date()
        });

        console.log(`✓✓ Message ${messageId} read by ${socket.user.name}`);
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // ==================== EVENT: Mark all messages in conversation as read ====================
    socket.on('conversation:mark-read', async (conversationId) => {
      try {
        // Get all unread messages in conversation that were NOT sent by the current user
        // This prevents the user's own messages from being marked as "read" when they view the conversation
        const messages = await Message.find({
          conversation: conversationId,
          sender: { $ne: userId }, // Only mark messages from OTHER users
          'readBy.user': { $ne: userId }
        });

        // Mark all as read and notify senders
        for (const message of messages) {
          await message.markAsRead(userId);

          // Emit read receipt to the message sender
          const senderId = message.sender.toString();
          io.to(`user:${senderId}`).emit('message:read-receipt', {
            messageId: message._id,
            conversationId,
            readBy: userId,
            readAt: new Date()
          });
        }

        // Update conversation last read
        await Conversation.updateOne(
          {
            _id: conversationId,
            'participants.user': userId
          },
          {
            $set: { 'participants.$.lastReadAt': new Date() }
          }
        );

        socket.emit('conversation:marked-read', { conversationId });
        console.log(`✓✓ ${messages.length} messages marked as read in conversation ${conversationId} by ${socket.user.name}`);
      } catch (error) {
        console.error('Error marking conversation as read:', error);
      }
    });

    // ==================== EVENT: Admin - Block conversation ====================
    socket.on('admin:block-conversation', async (data) => {
      if (userRole !== 'admin') {
        return socket.emit('error', { message: 'Unauthorized: Admin only' });
      }

      try {
        const { conversationId, reason } = data;

        await Conversation.findByIdAndUpdate(conversationId, {
          status: 'blocked',
          'adminActions.blockedBy': userId,
          'adminActions.blockedAt': new Date(),
          'adminActions.flaggedReason': reason
        });

        // Notify participants
        io.to(`conversation:${conversationId}`).emit('conversation:blocked', {
          conversationId,
          reason,
          blockedBy: socket.user.name
        });

        console.log(`🚫 Admin ${socket.user.name} blocked conversation ${conversationId}`);
      } catch (error) {
        console.error('Error blocking conversation:', error);
        socket.emit('error', { message: 'Failed to block conversation' });
      }
    });

    // ==================== EVENT: Admin - Send system announcement ====================
    socket.on('admin:send-announcement', async (data) => {
      if (userRole !== 'admin') {
        return socket.emit('error', { message: 'Unauthorized: Admin only' });
      }

      try {
        const { message, targetRole } = data; // 'all', 'customer', 'vendor'

        console.log(`📢 Admin ${socket.user.name} sending announcement to ${targetRole}`);

        // Create system message for all active conversations
        const conversations = await Conversation.find({
          status: 'active'
        });

        for (const conversation of conversations) {
          // Filter by target role if specified
          if (targetRole && targetRole !== 'all') {
            const hasTargetRole = conversation.participants.some(
              p => p.role === targetRole
            );
            if (!hasTargetRole) continue;
          }

          // Create system message
          const systemMessage = await Message.create({
            conversation: conversation._id,
            sender: userId,
            senderRole: 'system',
            content: {
              text: message,
              type: 'system'
            }
          });

          await systemMessage.populate('sender', 'name email avatar role');

          // Emit to conversation room
          io.to(`conversation:${conversation._id}`).emit('message:new', {
            message: systemMessage,
            conversationId: conversation._id,
            isSystemMessage: true
          });
        }

        socket.emit('announcement:sent', { success: true });
        console.log(`✅ System announcement sent to ${conversations.length} conversations`);
      } catch (error) {
        console.error('Error sending announcement:', error);
        socket.emit('error', { message: 'Failed to send announcement' });
      }
    });

    // ==================== EVENT: Get online status of specific user ====================
    socket.on('user:check-online', (targetUserId) => {
      const isOnline = connectedUsers.has(targetUserId);
      socket.emit('user:online-status', {
        userId: targetUserId,
        isOnline
      });
    });

    // ==================== DISCONNECT EVENT ====================
    socket.on('disconnect', (reason) => {
      console.log(`❌ User disconnected: ${socket.user.name} (${reason})`);

      // Remove from connected users
      connectedUsers.delete(userId);

      // Remove from all typing indicators
      for (const [conversationId, users] of typingUsers.entries()) {
        users.delete(userId);
        if (users.size === 0) {
          typingUsers.delete(conversationId);
        } else {
          // Notify that user stopped typing
          io.to(`conversation:${conversationId}`).emit('user:stop-typing', {
            userId,
            conversationId
          });
        }
      }

      // Emit offline status
      io.emit('user:offline', {
        userId,
        role: userRole,
        name: socket.user.name
      });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing Socket.io server');
    io.close(() => {
      console.log('Socket.io server closed');
    });
  });

  // Export for external access if needed
  return io;
};
