import apiClient from './client';
import { ENDPOINTS } from './config';

/**
 * Product API Service
 */
export const productService = {
  /**
   * Get all approved products
   * @param {Object} params - Query parameters { category, search, page, limit }
   * @returns {Promise} Products array
   */
  getProducts: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.PRODUCTS, { params });
    return response.data;
  },

  /**
   * Get product by ID
   * @param {string} productId
   * @returns {Promise} Product details
   */
  getProductById: async (productId) => {
    const response = await apiClient.get(ENDPOINTS.PRODUCT_BY_ID(productId));
    return response.data;
  },

  /**
   * Get vendor's products (for vendor role)
   * @returns {Promise} Vendor's products
   */
  getVendorProducts: async () => {
    const response = await apiClient.get(ENDPOINTS.VENDOR_PRODUCTS);
    return response.data;
  },

  /**
   * Create a new product (vendor only) - JSON data only
   * @param {Object} productData
   * @returns {Promise} Created product
   */
  createProduct: async (productData) => {
    const response = await apiClient.post(ENDPOINTS.PRODUCTS, productData);
    return response.data;
  },

  /**
   * Create a new product with images (vendor only) - FormData with images
   * @param {FormData} formData - FormData containing product data and images
   * @returns {Promise} Created product
   */
  createProductWithImages: async (formData) => {
    const response = await apiClient.post(ENDPOINTS.PRODUCTS, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Update product (vendor only)
   * @param {string} productId
   * @param {Object} productData
   * @returns {Promise} Updated product
   */
  updateProduct: async (productId, productData) => {
    const response = await apiClient.put(ENDPOINTS.PRODUCT_BY_ID(productId), productData);
    return response.data;
  },

  /**
   * Delete product (vendor only)
   * @param {string} productId
   * @returns {Promise}
   */
  deleteProduct: async (productId) => {
    const response = await apiClient.delete(ENDPOINTS.PRODUCT_BY_ID(productId));
    return response.data;
  },

  /**
   * Upload product images (vendor only)
   * @param {string} productId
   * @param {FormData} formData - FormData containing images
   * @returns {Promise} Upload result
   */
  uploadProductImages: async (productId, formData) => {
    const response = await apiClient.post(
      `/products/${productId}/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};
