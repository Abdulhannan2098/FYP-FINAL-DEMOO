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
const { productValidation, productUpdateValidation } = require('../utils/validators');
const validateRequest = require('../middlewares/validateRequest');

// Admin Routes (must be before /:id route to avoid conflict)
router.get('/admin/all', protect, authorize('admin'), getAllProductsAdmin);

// Vendor Routes (must be before /:id route to avoid conflict)
router.get('/vendor/my-products', protect, authorize('vendor'), getVendorProducts);

// Public Routes
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Protected Routes
router.post('/', protect, authorize('vendor'), uploadProductImages.array('images', 5), productValidation, validateRequest, createProduct);
router.put('/:id/approve', protect, authorize('admin'), approveProduct);
router.put('/:id', protect, authorize('vendor', 'admin'), productUpdateValidation, validateRequest, updateProduct);
router.delete('/:id', protect, authorize('vendor', 'admin'), deleteProduct);

// 3D Model Routes
router.post('/:id/upload-3d-model', protect, authorize('vendor', 'admin'), upload3DModel);
router.delete('/:id/3d-model', protect, authorize('vendor', 'admin'), delete3DModel);

module.exports = router;
