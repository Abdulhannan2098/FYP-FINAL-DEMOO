const mongoose = require('mongoose');
const Counter = require('./Counter');

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1'],
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ['Credit Card', 'Debit Card', 'PayPal', 'Cash on Delivery'],
      default: 'Cash on Delivery',
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    status: {
      type: String,
      enum: [
        'Pending Vendor Action',
        'Accepted',
        'Rejected',
        'In Progress',
        'Shipped',
        'Completed',
        'Cancelled',
      ],
      default: 'Pending Vendor Action',
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vendorRejectionReason: {
      type: String,
      default: '',
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: String,
      },
    ],
    // Multi-vendor cart support fields
    parentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    checkoutSessionId: {
      type: String,
      default: null,
    },
    grandTotal: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'orders',
  }
);

// Add initial status to history on creation + generate stable unique orderNumber
orderSchema.pre('save', async function (next) {
  try {
    if (!this.orderNumber) {
      const counter = await Counter.findByIdAndUpdate(
        'orderNumber',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      const seq = Number(counter?.seq ?? 0);
      this.orderNumber = `AS-${String(seq).padStart(10, '0')}`;
    }

    if (this.isNew) {
      this.statusHistory.push({
        status: this.status,
        timestamp: new Date(),
        updatedBy: this.customer,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Order', orderSchema);