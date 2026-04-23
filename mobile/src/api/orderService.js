import apiClient from './client';
import { ENDPOINTS } from './config';

/**
 * Order API Service
 */
export const orderService = {
  /**
   * Get customer orders
   * @returns {Promise} Customer's orders
   */
  getCustomerOrders: async () => {
    const response = await apiClient.get(ENDPOINTS.CUSTOMER_ORDERS);
    return response.data;
  },

  /**
   * Get vendor orders
   * @returns {Promise} Vendor's orders
   */
  getVendorOrders: async () => {
    const response = await apiClient.get(ENDPOINTS.VENDOR_ORDERS);
    return response.data;
  },

  /**
   * Create a new order (checkout)
   * @param {Object} orderData - { items, shippingAddress, paymentMethod }
   * @returns {Promise} Created order
   */
  createOrder: async (orderData) => {
    const response = await apiClient.post(ENDPOINTS.ORDERS, orderData);
    return response.data;
  },

  /**
   * Get order by ID
   * @param {string} orderId
   * @returns {Promise} Order details
   */
  getOrderById: async (orderId) => {
    const response = await apiClient.get(ENDPOINTS.ORDER_BY_ID(orderId));
    return response.data;
  },

  /**
   * Update order status (vendor only)
   * @param {string} orderId
   * @param {string} status - New status
   * @returns {Promise} Updated order
   */
  updateOrderStatus: async (orderId, status) => {
    const response = await apiClient.put(ENDPOINTS.UPDATE_ORDER_STATUS(orderId), { status });
    return response.data;
  },

  /**
   * Accept order (vendor only)
   * @param {string} orderId
   * @returns {Promise} Updated order
   */
  acceptOrder: async (orderId) => {
    return orderService.updateOrderStatus(orderId, 'In Progress');
  },

  /**
   * Reject order (vendor only)
   * @param {string} orderId
   * @param {string} reason - Rejection reason
   * @returns {Promise} Updated order
   */
  rejectOrder: async (orderId, reason) => {
    const response = await apiClient.put(ENDPOINTS.UPDATE_ORDER_STATUS(orderId), {
      status: 'Cancelled',
      rejectionReason: reason,
      note: reason,
    });
    return response.data;
  },
};
