const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Conversation reference
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },

  // Sender
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['customer', 'vendor', 'admin', 'system'],
    required: true
  },

  // Content
  content: {
    text: {
      type: String,
      required: function() {
        return this.content.type === 'text';
      },
      maxlength: 5000
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text'
    },
    fileUrl: String,
    fileName: String,
    fileSize: Number, // in bytes
    mimeType: String
  },

  // Status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'deleted', 'edited'],
    default: 'sent'
  },

  // Read receipts
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Editing
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  originalText: String,

  // Deletion
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    replyTo: { // For message threading
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    }
  }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ 'readBy.user': 1 });
messageSchema.index({ status: 1 });

// Instance method to mark as read
messageSchema.methods.markAsRead = async function(userId) {
  // Don't add to readBy if already read by this user
  if (this.readBy.some(r => r.user.toString() === userId.toString())) {
    return this;
  }

  // Add to readBy array
  this.readBy.push({ user: userId, readAt: new Date() });

  // Only change status to 'read' if someone OTHER than the sender reads it
  // This prevents the sender's own messages from showing as "read" when they mark the conversation as read
  const senderId = this.sender.toString();
  const readerId = userId.toString();

  if (senderId !== readerId) {
    this.status = 'read';
  }

  await this.save();
  return this;
};

// Pre-save hook to update conversation
messageSchema.pre('save', async function(next) {
  if (this.isNew && !this.isDeleted) {
    try {
      await mongoose.model('Conversation').findByIdAndUpdate(
        this.conversation,
        {
          lastMessage: {
            sender: this.sender,
            text: this.content.text || `[${this.content.type}]`,
            timestamp: this.createdAt || new Date(),
            type: this.content.type
          },
          $inc: { 'metadata.totalMessages': 1 }
        }
      );
    } catch (error) {
      console.error('Error updating conversation:', error);
    }
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);
