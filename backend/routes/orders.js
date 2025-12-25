const express = require('express');
const router = express.Router();
const {
  createOrder,
  getCustomerOrders,
  getVendorOrders,
  getAllOrders,
  getOrder,
  updateOrderStatus,
} = require('../controllers/orderController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const { orderValidation } = require('../utils/validators');

router.post('/', protect, authorize('customer'), orderValidation, createOrder);
router.get('/user', protect, authorize('customer'), getCustomerOrders);
router.get('/vendor', protect, authorize('vendor'), getVendorOrders);
router.get('/', protect, authorize('admin'), getAllOrders);
router.get('/:id', protect, getOrder);
router.put('/:id/status', protect, authorize('vendor', 'admin'), updateOrderStatus);

module.exports = router;