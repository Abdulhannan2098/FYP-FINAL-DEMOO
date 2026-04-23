const mongoose = require('mongoose');
const Counter = require('./Counter');

const normalizeOrderStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'accepted') return 'In Progress';
  if (normalized === 'rejected') return 'Cancelled';
  if (normalized === 'completed') return 'Delivered';
  if (normalized === 'pending') return 'Pending Vendor Action';

  if (normalized === 'in progress') return 'In Progress';
  if (normalized === 'shipped') return 'Shipped';
  if (normalized === 'delivered') return 'Delivered';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'Cancelled';
  if (normalized === 'pending vendor action') return 'Pending Vendor Action';

  return status;
};

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
        'In Progress',
        'Shipped',
        'Delivered',
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

orderSchema.virtual('orderId').get(function () {
  return String(this.orderNumber || this._id);
});

// Add initial status to history on creation + generate stable unique orderNumber
orderSchema.pre('validate', function (next) {
  this.status = normalizeOrderStatus(this.status);

  if (Array.isArray(this.statusHistory) && this.statusHistory.length > 0) {
    this.statusHistory = this.statusHistory.map((entry) => ({
      ...entry,
      status: normalizeOrderStatus(entry.status),
    }));
  }

  next();
});

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