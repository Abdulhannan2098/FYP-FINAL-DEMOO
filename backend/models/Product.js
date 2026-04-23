const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a product description'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide a product price'],
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Please provide a category'],
      enum: [
        'Rims & Wheels',
        'Spoilers',
        'Body Kits',
        'Hoods',
        'LED Lights',
        'Body Wraps / Skins',
        'Exhaust Systems',
        'Interior Accessories',
      ],
    },
    stock: {
      type: Number,
      required: [true, 'Please provide stock quantity'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    images: [
      {
        type: String,
        default: 'https://via.placeholder.com/400x300?text=Product+Image',
      },
    ],
    approvalStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    // ==================== AI REVIEW FIELDS ====================
    aiReviewed: {
      type: Boolean,
      default: false,
    },
    aiDecision: {
      type: String,
      enum: ['auto_approved', 'pending_review', 'auto_rejected', null],
      default: null,
    },
    aiConfidenceScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    aiReason: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    // 3D Model & AR Preview
    model3D: {
      glbFile: {
        type: String,
        default: null,
      },
      usdzFile: {
        type: String,
        default: null,
      },
      thumbnailAR: {
        type: String,
        default: null,
      },
      fileSize: {
        type: Number, // in KB
        default: 0,
      },
      isARReady: {
        type: Boolean,
        default: false,
      },
      dimensions: {
        length: { type: Number, default: 0 }, // in cm
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
      },
      uploadedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
    collection: 'products',
  }
);

// ==================== PERFORMANCE INDEXES ====================
// Compound index for most common query patterns
productSchema.index({ isApproved: 1, approvalStatus: 1, createdAt: 1 });

// Individual indexes for filtering
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ vendor: 1 });
productSchema.index({ stock: 1 });

// Text index for search functionality
productSchema.index({ name: 'text', description: 'text', category: 'text' });

// Compound index for price range queries
productSchema.index({ isApproved: 1, price: 1 });

// Compound index for category + approval
productSchema.index({ category: 1, isApproved: 1, createdAt: 1 });

module.exports = mongoose.model('Product', productSchema);