const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const ChatNotification = require('../models/ChatNotification');
const Product = require('../models/Product');
const User = require('../models/user');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/chat';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images, PDFs, and Word documents are allowed!'));
  }
};

exports.upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// @desc    Create or get conversation
// @route   POST /api/chat/conversations
// @access  Private (Customer, Vendor, Admin)
exports.createOrGetConversation = async (req, res) => {
  try {
    const { productId, vendorId } = req.body;
    const customerId = req.user.id;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Use vendor from product if not provided
    const actualVendorId = vendorId || product.vendorId;

    // Find or create conversation
    const conversation = await Conversation.findOrCreate({
      customer: customerId,
      vendor: actualVendorId,
      product: productId
    });

    res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create conversation',
      error: error.message
    });
  }
};

// @desc    Get all conversations for current user
// @route   GET /api/chat/conversations
// @access  Private
exports.getMyConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const query = {
      'participants.user': userId
    };

    // Only filter by status if explicitly provided
    if (status) {
      query.status = status;
    }

    // Admin can see all conversations
    if (req.user.role === 'admin') {
      delete query['participants.user'];
    }

    const conversations = await Conversation.find(query)
      .populate('participants.user', 'name email avatar role')
      .populate('context.product', 'name images price vendorId')
      .populate('lastMessage.sender', 'name avatar')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Calculate unread count for each conversation
    for (let conversation of conversations) {
      const participant = conversation.participants.find(
        p => p.user._id.toString() === userId
      );
      
      if (participant) {
        const unreadCount = await Message.countDocuments({
          conversation: conversation._id,
          'readBy.user': { $ne: userId },
          sender: { $ne: userId },
          createdAt: { $gt: participant.lastReadAt }
        });
        
        conversation._unreadCount = unreadCount;
      }
    }

    const total = await Conversation.countDocuments(query);

    res.status(200).json({
      success: true,
      data: conversations,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
};

// @desc    Get single conversation by ID
// @route   GET /api/chat/conversations/:id
// @access  Private
exports.getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(id)
      .populate('participants.user', 'name email avatar role')
      .populate('context.product', 'name images price description vendorId')
      .populate('context.order', 'orderNumber status');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check authorization
    const isParticipant = conversation.participants.some(
      p => p.user._id.toString() === userId
    );
    const isAdmin = req.user.role === 'admin';

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this conversation'
      });
    }

    res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation',
      error: error.message
    });
  }
};

// @desc    Get messages for a conversation
// @route   GET /api/chat/conversations/:id/messages
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;

    // Verify access to conversation
    const conversation = await Conversation.findById(id);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const isParticipant = conversation.participants.some(
      p => p.user.toString() === userId
    );
    const isAdmin = req.user.role === 'admin';

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these messages'
      });
    }

    // Get messages with pagination
    const messages = await Message.find({
      conversation: id,
      isDeleted: false
    })
      .populate('sender', 'name email avatar role')
      .populate('metadata.replyTo', 'content.text sender')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Message.countDocuments({
      conversation: id,
      isDeleted: false
    });

    res.status(200).json({
      success: true,
      data: messages.reverse(), // Reverse to show oldest first
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

// @desc    Archive a conversation
// @route   PUT /api/chat/conversations/:id/archive
// @access  Private
exports.archiveConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(
      p => p.user.toString() === userId
    );

    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to archive this conversation'
      });
    }

    conversation.status = 'archived';
    await conversation.save();

    res.status(200).json({
      success: true,
      message: 'Conversation archived successfully',
      data: conversation
    });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive conversation',
      error: error.message
    });
  }
};

// @desc    Block a conversation (Admin only)
// @route   PUT /api/chat/conversations/:id/block
// @access  Private (Admin)
exports.blockConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const conversation = await Conversation.findByIdAndUpdate(
      id,
      {
        status: 'blocked',
        'adminActions.blockedBy': userId,
        'adminActions.blockedAt': new Date(),
        'adminActions.flaggedReason': reason
      },
      { new: true }
    ).populate('participants.user', 'name email avatar role')
     .populate('context.product', 'name images price vendorId')
     .populate('lastMessage.sender', 'name avatar');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Notify participants via Socket.io
    // Emit to each participant's personal room (not conversation room)
    const io = req.app.get('io');
    if (io) {
      // Collect all user IDs to notify (participants + admin)
      const usersToNotify = new Set();

      // Add all participants
      for (const participant of conversation.participants) {
        usersToNotify.add(participant.user._id.toString());
      }

      // Add admin (may already be in set if admin is a participant)
      usersToNotify.add(userId);

      // Emit once to each unique user
      for (const userIdToNotify of usersToNotify) {
        io.to(`user:${userIdToNotify}`).emit('conversation:blocked', {
          conversationId: id,
          reason,
          blockedBy: req.user.name
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Conversation blocked successfully',
      data: conversation
    });
  } catch (error) {
    console.error('Error blocking conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block conversation',
      error: error.message
    });
  }
};

// @desc    Unblock a conversation (Admin only)
// @route   PUT /api/chat/conversations/:id/unblock
// @access  Private (Admin)
exports.unblockConversation = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const conversation = await Conversation.findByIdAndUpdate(
      id,
      {
        status: 'active',
        'adminActions.blockedBy': null,
        'adminActions.blockedAt': null,
        'adminActions.flaggedReason': null
      },
      { new: true }
    ).populate('participants.user', 'name email avatar role')
     .populate('context.product', 'name images price vendorId')
     .populate('lastMessage.sender', 'name avatar');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Notify participants via Socket.io
    // Emit to each participant's personal room (not conversation room)
    const io = req.app.get('io');
    if (io) {
      const userId = req.user.id;

      // Collect all user IDs to notify (participants + admin)
      const usersToNotify = new Set();

      // Add all participants
      for (const participant of conversation.participants) {
        usersToNotify.add(participant.user._id.toString());
      }

      // Add admin (may already be in set if admin is a participant)
      usersToNotify.add(userId);

      // Emit once to each unique user
      for (const userIdToNotify of usersToNotify) {
        io.to(`user:${userIdToNotify}`).emit('conversation:unblocked', {
          conversationId: id,
          unblockedBy: req.user.name
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Conversation unblocked successfully',
      data: conversation
    });
  } catch (error) {
    console.error('Error unblocking conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unblock conversation',
      error: error.message
    });
  }
};

// @desc    Delete entire conversation
// @route   DELETE /api/chat/conversations/:id
// @access  Private (Vendor, Admin)
exports.deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if user is participant or admin
    const isParticipant = conversation.participants.some(
      p => p.user.toString() === userId
    );
    const isAdmin = userRole === 'admin';

    // Allow all participants (customer, vendor) and admins to delete
    if (!isParticipant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this conversation'
      });
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversation: id });

    // Delete all notifications for this conversation
    await ChatNotification.deleteMany({ conversationId: id });

    // Delete the conversation
    await Conversation.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Conversation and all messages deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversation',
      error: error.message
    });
  }
};

// @desc    Delete a message
// @route   DELETE /api/chat/messages/:id
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender or admin
    if (message.sender.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = userId;
    await message.save();

    // Emit to conversation room via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${message.conversation}`).emit('message:deleted', {
        messageId: id,
        conversationId: message.conversation
      });
    }

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
};

// @desc    Get notifications for current user
// @route   GET /api/chat/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { unreadOnly = false, page = 1, limit = 20 } = req.query;

    const query = { user: userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await ChatNotification.find(query)
      .populate('conversation', 'context.product lastMessage')
      .populate('message', 'content.text sender')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ChatNotification.countDocuments(query);
    const unreadCount = await ChatNotification.countDocuments({
      user: userId,
      read: false
    });

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/chat/notifications/:id/read
// @access  Private
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await ChatNotification.findOneAndUpdate(
      { _id: id, user: userId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/chat/notifications/read-all
// @access  Private
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await ChatNotification.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

// @desc    Get chat statistics (Admin only)
// @route   GET /api/chat/stats
// @access  Private (Admin)
exports.getChatStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const [
      totalConversations,
      activeConversations,
      blockedConversations,
      totalMessages,
      messagesLast24h
    ] = await Promise.all([
      Conversation.countDocuments(),
      Conversation.countDocuments({ status: 'active' }),
      Conversation.countDocuments({ status: 'blocked' }),
      Message.countDocuments({ isDeleted: false }),
      Message.countDocuments({
        isDeleted: false,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    // Average response time
    const conversations = await Conversation.find({
      'metadata.averageResponseTime': { $exists: true }
    }).select('metadata.averageResponseTime');

    const avgResponseTime = conversations.length > 0
      ? conversations.reduce((sum, c) => sum + (c.metadata.averageResponseTime || 0), 0) / conversations.length
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalConversations,
        activeConversations,
        blockedConversations,
        totalMessages,
        messagesLast24h,
        avgResponseTimeSeconds: Math.round(avgResponseTime),
        avgResponseTimeFormatted: `${Math.floor(avgResponseTime / 60)}m ${Math.round(avgResponseTime % 60)}s`
      }
    });
  } catch (error) {
    console.error('Error fetching chat stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat statistics',
      error: error.message
    });
  }
};

// @desc    Upload file and send message
// @route   POST /api/chat/messages/upload
// @access  Private
exports.uploadFileMessage = async (req, res) => {
  try {
    const { conversationId, receiverId, content } = req.body;
    const senderId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Verify conversation exists and user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const isParticipant = conversation.participants.some(
      p => p.user.toString() === senderId
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this conversation'
      });
    }

    // Determine content type based on file mime type
    let contentType = 'file';
    if (req.file.mimetype.startsWith('image/')) {
      contentType = 'image';
    }

    // Create file URL
    const fileUrl = `/uploads/chat/${req.file.filename}`;

    // Create message with file
    const message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      senderRole: req.user.role, // Add sender role
      content: {
        type: contentType,
        text: content || '',
        fileUrl: fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    });

    // Populate sender info
    await message.populate('sender', 'name email');

    // Create notification for receiver
    await ChatNotification.create({
      user: receiverId,
      conversation: conversationId,
      message: message._id,
      type: 'new-message',
      title: `New ${contentType === 'image' ? 'image' : 'file'} from ${req.user.name}`,
      body: req.file.originalname
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(conversationId).emit('message:new', {
        message,
        conversationId
      });

      io.to(receiverId).emit('notification:new', {
        conversationId,
        senderId,
        senderName: req.user.name,
        messagePreview: contentType === 'image' ? '📷 Image' : '📎 File'
      });
    }

    res.status(201).json({
      success: true,
      message: 'File uploaded and message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
};
