/**
 * AIFeedback model
 *
 * Stores every admin override of an AI decision so the classification
 * system can be continuously improved.  The records are lightweight and
 * append-only — admins never edit or delete them.
 *
 * Use-cases:
 *  • Offline analysis / retraining of keyword weights
 *  • Admin override audit trail
 *  • Dataset for future ML fine-tuning
 */

const mongoose = require('mongoose');

const aiFeedbackSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
    },
    productDescription: {
      type: String,
      default: '',
    },
    productCategory: {
      type: String,
      default: '',
    },

    // What the AI decided
    aiDecision: {
      type: String,
      enum: ['auto_approved', 'pending_review', 'auto_rejected'],
      required: true,
    },
    aiConfidenceScore: {
      type: Number,
      required: true,
    },
    aiReason: {
      type: String,
      default: '',
    },
    // Layer debug info from the hybrid engine
    aiLayers: {
      hardRule:       { type: String, default: null },
      phraseScore:    { type: Number, default: 0   },
      semanticCarSim: { type: Number, default: 0   },
      semanticNetSim: { type: Number, default: 0   },
    },

    // What the admin actually decided (override)
    adminAction: {
      type: String,
      enum: ['approve', 'reject'],
      required: true,
    },
    adminRejectionReason: {
      type: String,
      default: '',
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Whether this was a true override (admin disagreed with AI)
    wasOverride: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'ai_feedback',
  }
);

// Index for analytics queries
aiFeedbackSchema.index({ aiDecision: 1, adminAction: 1 });
aiFeedbackSchema.index({ wasOverride: 1, createdAt: -1 });

module.exports = mongoose.model('AIFeedback', aiFeedbackSchema);
