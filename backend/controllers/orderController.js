const Order = require('../models/Order');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } = require('../utils/emailService');

// @desc    Create a new order (supports multi-vendor)
// @route   POST /api/orders
// @access  Private (Customer)
exports.createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    // Prevent vendors from creating orders
    if (req.user.role === 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Vendors are not allowed to purchase products',
      });
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No order items provided',
      });
    }

    // Extra hardening: never trust client quantity types
    for (const item of items) {
      const quantity = Number(item?.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid item quantity. Quantity must be an integer between 1 and 100.',
        });
      }
    }

    // Group items by vendor and validate products
    const itemsByVendor = {};
    let grandTotal = 0;
    const stockAdjustments = [];
    const emailItems = [];

    const rollbackStock = async () => {
      if (stockAdjustments.length === 0) return;
      await Promise.all(
        stockAdjustments.map(({ productId, quantity }) =>
          Product.findByIdAndUpdate(productId, { $inc: { stock: quantity } })
        )
      );
    };

    // Normalize items by merging duplicate product entries
    const mergedItemsMap = new Map();
    for (const item of items) {
      const productId = String(item?.product ?? '');
      const quantity = Number(item?.quantity);
      mergedItemsMap.set(productId, (mergedItemsMap.get(productId) ?? 0) + quantity);
    }

    const normalizedItems = Array.from(mergedItemsMap.entries()).map(([product, quantity]) => ({
      product,
      quantity,
    }));

    for (const item of normalizedItems) {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid item quantity. Quantity must be an integer between 1 and 100.',
        });
      }

      const product = await Product.findById(item.product).populate('vendor');
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`,
        });
      }

      // Check if product is approved
      if (!product.isApproved || product.approvalStatus !== 'Approved') {
        return res.status(400).json({
          success: false,
          message: `Product "${product.name}" is not available for purchase`,
        });
      }

      // Atomically decrement stock to prevent overselling (race-safe)
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: product._id,
          isApproved: true,
          approvalStatus: 'Approved',
          stock: { $gte: quantity },
        },
        { $inc: { stock: -quantity } },
        { new: true }
      );

      if (!updatedProduct) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${product.name}`,
        });
      }

      stockAdjustments.push({ productId: product._id, quantity });

      // Group items by vendor
      const vendorId = product.vendor._id.toString();
      if (!itemsByVendor[vendorId]) {
        itemsByVendor[vendorId] = {
          vendorId: product.vendor._id,
          vendorName: product.vendor.name,
          items: [],
          subtotal: 0,
        };
      }

      // Server-side price calculation to prevent client price tampering
      const unitPrice = Number(updatedProduct.price);
      const itemTotal = unitPrice * quantity;

      itemsByVendor[vendorId].items.push({
        product: product._id,
        quantity,
        price: unitPrice,
      });
      itemsByVendor[vendorId].subtotal += itemTotal;
      grandTotal += itemTotal;

      emailItems.push({
        name: product.name,
        quantity,
        price: unitPrice,
      });
    }

    // Generate unique checkout session ID
    const checkoutSessionId = `checkout_${Date.now()}_${req.user.id}`;

    // Create separate order for each vendor
    const createdOrders = [];
    const vendorGroups = Object.values(itemsByVendor);

    try {
      for (const vendorGroup of vendorGroups) {
        const order = await Order.create({
          customer: req.user.id,
          vendor: vendorGroup.vendorId,
          items: vendorGroup.items,
          totalAmount: vendorGroup.subtotal,
          shippingAddress,
          paymentMethod,
          status: 'Pending Vendor Action',
          checkoutSessionId,
          grandTotal,
        });

        const populatedOrder = await Order.findById(order._id)
          .populate('customer', 'name email phone')
          .populate('vendor', 'name email')
          .populate('items.product', 'name price images');

        createdOrders.push(populatedOrder);
      }
    } catch (err) {
      await rollbackStock();
      throw err;
    }

    // Send order confirmation email (non-blocking)
    sendOrderConfirmationEmail(
      req.user.email,
      req.user.name,
      checkoutSessionId.slice(-8).toUpperCase(),
      emailItems,
      grandTotal,
      createdOrders.length
    ).catch(err => console.error('Failed to send order confirmation email:', err.message));

    // Prepare response
    const response = {
      success: true,
      message: `Order${createdOrders.length > 1 ? 's' : ''} created successfully`,
      data: {
        checkoutSessionId,
        grandTotal,
        vendorCount: createdOrders.length,
        orders: createdOrders,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer's orders
// @route   GET /api/orders/user
// @access  Private (Customer)
exports.getCustomerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('vendor', 'name email')
      .populate('items.product', 'name price images')
      .sort({ createdAt: -1 });

    // Backfill missing orderNumber for legacy orders (best-effort)
    await Promise.all(
      orders
        .filter((o) => !o.orderNumber)
        .map(async (o) => {
          try {
            await o.save();
          } catch (e) {
            // Ignore duplicate/validation issues; caller still gets orders.
          }
        })
    );

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vendor's orders
// @route   GET /api/orders/vendor
// @access  Private (Vendor)
exports.getVendorOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ vendor: req.user.id })
      .populate('customer', 'name email phone')
      .populate('vendor', 'name email')
      .populate('items.product', 'name price images')
      .sort({ createdAt: -1 });

    // Backfill missing orderNumber for legacy orders (best-effort)
    await Promise.all(
      orders
        .filter((o) => !o.orderNumber)
        .map(async (o) => {
          try {
            await o.save();
          } catch (e) {
            // Ignore duplicate/validation issues; caller still gets orders.
          }
        })
    );

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private (Admin)
exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name email phone')
      .populate('vendor', 'name email')
      .populate('items.product', 'name price images')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('vendor', 'name email')
      .populate('items.product', 'name price images vendor');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check authorization
    if (req.user.role === 'customer' && order.customer._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order',
      });
    }

    if (req.user.role === 'vendor' && order.vendor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order',
      });
    }

    // Backfill missing orderNumber for legacy orders (best-effort)
    if (!order.orderNumber) {
      try {
        await order.save();
      } catch (e) {
        // ignore
      }
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Vendor only)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason, note } = req.body;

    const validStatuses = [
      'Accepted',
      'Rejected',
      'In Progress',
      'Shipped',
      'Completed',
      'Cancelled',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Only the assigned vendor can update order status
    if (req.user.role === 'vendor' && order.vendor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order',
      });
    }

    // Admins can only view, not update
    if (req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admins cannot modify order status. Only vendors can update their orders.',
      });
    }

    // If rejecting, require a reason
    if (status === 'Rejected' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting an order',
      });
    }

    // Update status
    order.status = status;
    if (status === 'Rejected') {
      order.vendorRejectionReason = rejectionReason;
    }

    order.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: req.user.id,
      note: note || (status === 'Rejected' ? rejectionReason : ''),
    });

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email phone')
      .populate('vendor', 'name email')
      .populate('items.product', 'name price images');

    // Send order status update email (non-blocking)
    if (updatedOrder.customer && updatedOrder.customer.email) {
      sendOrderStatusUpdateEmail(
        updatedOrder.customer.email,
        updatedOrder.customer.name,
        updatedOrder.orderNumber || updatedOrder._id.toString().slice(-12).toUpperCase(),
        status,
        updatedOrder.vendor?.name || 'Vendor'
      ).catch(err => console.error('Failed to send order status email:', err.message));
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete shipped/completed orders (Admin)
// @route   POST /api/orders/admin/bulk-delete
// @access  Private (Admin)
exports.bulkDeleteOrders = async (req, res, next) => {
  try {
    const { orderIds } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'orderIds must be a non-empty array',
      });
    }

    if (orderIds.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Too many orders selected for deletion at once',
      });
    }

    const uniqueIds = Array.from(new Set(orderIds.map((id) => String(id))));
    const invalidIds = uniqueIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'One or more order IDs are invalid',
        invalidIds,
      });
    }

    const allowedStatuses = new Set(['Shipped', 'Completed']);

    const orders = await Order.find({ _id: { $in: uniqueIds } })
      .select('_id status')
      .lean()
      .exec();

    const foundIdSet = new Set(orders.map((o) => String(o._id)));
    const missingIds = uniqueIds.filter((id) => !foundIdSet.has(id));
    if (missingIds.length > 0) {
      return res.status(404).json({
        success: false,
        message: 'One or more orders were not found',
        missingIds,
      });
    }

    const nonDeletable = orders
      .filter((o) => !allowedStatuses.has(o.status))
      .map((o) => ({ id: String(o._id), status: o.status }));

    if (nonDeletable.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Only Shipped/Completed orders can be deleted',
        nonDeletable,
      });
    }

    const deleteResult = await Order.deleteMany({
      _id: { $in: uniqueIds },
      status: { $in: Array.from(allowedStatuses) },
    });

    if (deleteResult.deletedCount !== uniqueIds.length) {
      return res.status(409).json({
        success: false,
        message: 'Some orders could not be deleted (their status may have changed). Please refresh and try again.',
        deletedCount: deleteResult.deletedCount,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Orders deleted successfully',
      deletedCount: deleteResult.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};
