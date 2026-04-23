const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getVendorProducts,
  getAllProductsAdmin,
  approveProduct,
  upload3DModel,
  delete3DModel,
  uploadProductImages,
} = require('../controllers/productController');

const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const { requireVerifiedVendor } = require('../middlewares/vendorMiddleware');
const { productValidation, productUpdateValidation } = require('../utils/validators');
const validateRequest = require('../middlewares/validateRequest');

// Admin Routes (must be before /:id route to avoid conflict)
router.get('/admin/all', protect, authorize('admin'), getAllProductsAdmin);

// Vendor Routes (must be before /:id route to avoid conflict)
router.get('/vendor/my-products', protect, authorize('vendor'), getVendorProducts);

// Public Routes
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Protected Routes (requireVerifiedVendor ensures only verified vendors can create/manage products)
router.post('/', protect, authorize('vendor'), requireVerifiedVendor, uploadProductImages.array('images', 5), productValidation, validateRequest, createProduct);
router.put('/:id/approve', protect, authorize('admin'), approveProduct);
router.put('/:id', protect, authorize('vendor', 'admin'), requireVerifiedVendor, productUpdateValidation, validateRequest, updateProduct);
router.delete('/:id', protect, authorize('vendor', 'admin'), requireVerifiedVendor, deleteProduct);

// 3D Model Routes (require verified vendor)
router.post('/:id/upload-3d-model', protect, authorize('vendor', 'admin'), requireVerifiedVendor, upload3DModel);
router.delete('/:id/3d-model', protect, authorize('vendor', 'admin'), requireVerifiedVendor, delete3DModel);

module.exports = router;
