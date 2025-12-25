const Order = require('../models/Order');
const Product = require('../models/Product');
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
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No order items provided',
      });
    }

    // Group items by vendor and validate products
    const itemsByVendor = {};
    let grandTotal = 0;
    const productsToUpdate = [];

    for (const item of items) {
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

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${product.name}`,
        });
      }

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

      const itemTotal = product.price * item.quantity;
      itemsByVendor[vendorId].items.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });
      itemsByVendor[vendorId].subtotal += itemTotal;
      grandTotal += itemTotal;

      // Track products for stock update
      productsToUpdate.push({
        productId: product._id,
        quantity: item.quantity,
      });
    }

    // Generate unique checkout session ID
    const checkoutSessionId = `checkout_${Date.now()}_${req.user.id}`;

    // Create separate order for each vendor
    const createdOrders = [];
    const vendorGroups = Object.values(itemsByVendor);

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

    // Update product stock after all orders are created
    for (const productUpdate of productsToUpdate) {
      await Product.findByIdAndUpdate(productUpdate.productId, {
        $inc: { stock: -productUpdate.quantity },
      });
    }

    // Send order confirmation email (non-blocking)
    const orderItems = items.map(item => ({
      name: item.product?.name || 'Product',
      quantity: item.quantity,
      price: item.price,
    }));

    sendOrderConfirmationEmail(
      req.user.email,
      req.user.name,
      checkoutSessionId.slice(-8).toUpperCase(),
      orderItems,
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
      .populate('items.product', 'name price images vendor');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check authorization
    if (
      req.user.role === 'customer' &&
      order.customer._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order',
      });
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
        updatedOrder._id.toString().slice(-8).toUpperCase(),
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
