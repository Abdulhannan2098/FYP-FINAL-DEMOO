const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // Participants
  participants: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      role: {
        type: String,
        enum: ['customer', 'vendor', 'admin'],
        required: true
      },
      lastReadAt: {
        type: Date,
        default: Date.now
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  // Conversation Type
  type: {
    type: String,
    enum: ['product-inquiry', 'order-support', 'general', 'admin-monitor'],
    required: true,
    default: 'product-inquiry'
  },

  // Context (what the chat is about)
  context: {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    subject: String
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'blocked'],
    default: 'active'
  },

  // Last Message (for quick display)
  lastMessage: {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    timestamp: Date,
    type: {
      type: String,
      enum: ['text', 'image', 'file']
    }
  },

  // Metadata
  metadata: {
    totalMessages: {
      type: Number,
      default: 0
    },
    customerSatisfactionRating: Number,
    averageResponseTime: Number, // in seconds
    isUrgent: {
      type: Boolean,
      default: false
    },
    tags: [String] // ['payment-issue', 'shipping-query', etc.]
  },

  // Admin Controls
  adminActions: {
    isMonitored: {
      type: Boolean,
      default: false
    },
    monitoredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    flaggedReason: String,
    blockedAt: Date,
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
conversationSchema.index({ 'participants.user': 1 });
conversationSchema.index({ 'context.product': 1 });
conversationSchema.index({ status: 1, updatedAt: -1 });
conversationSchema.index({ 'lastMessage.timestamp': -1 });

// Virtual for unread count
conversationSchema.virtual('unreadCount').get(function() {
  return this._unreadCount || 0;
});

// Enable virtuals in JSON
conversationSchema.set('toJSON', { virtuals: true });
conversationSchema.set('toObject', { virtuals: true });

// Instance method to get other participant
conversationSchema.methods.getOtherParticipant = function(userId) {
  return this.participants.find(
    p => p.user.toString() !== userId.toString()
  );
};

// Static method to find or create conversation
conversationSchema.statics.findOrCreate = async function(data) {
  const { customer, vendor, product } = data;

  // Check if conversation already exists between customer and vendor (including blocked ones)
  let conversation = await this.findOne({
    'participants.user': { $all: [customer, vendor] }
  }).populate('participants.user', 'name email avatar role')
    .populate('context.product', 'name images vendorId');

  if (!conversation) {
    // Create new conversation only if no conversation exists at all
    conversation = await this.create({
      participants: [
        { user: customer, role: 'customer' },
        { user: vendor, role: 'vendor' }
      ],
      type: 'product-inquiry',
      context: { product },
      status: 'active'
    });

    // Populate after creation
    conversation = await this.findById(conversation._id)
      .populate('participants.user', 'name email avatar role')
      .populate('context.product', 'name images vendorId');
  } else if (conversation.status === 'blocked') {
    // If conversation is blocked, don't allow creating a new one or sending messages
    // Just return the blocked conversation - the frontend will handle the UI
    return conversation;
  } else if (product && conversation.context?.product?.toString() !== product.toString()) {
    // If conversation exists and is active, update the product context
    conversation.context.product = product;
    await conversation.save();

    // Re-populate after update
    conversation = await this.findById(conversation._id)
      .populate('participants.user', 'name email avatar role')
      .populate('context.product', 'name images vendorId');
  }

  return conversation;
};

module.exports = mongoose.model('Conversation', conversationSchema);
