const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for product image uploads
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/products';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG) are allowed!'));
  }
};

exports.uploadProductImages = multer({
  storage: productStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB per image
  fileFilter: imageFilter
});

// @desc    Create a new product (Vendor)
// @route   POST /api/products
// @access  Private (Vendor)
exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, category, stock } = req.body;

    console.log('=== BACKEND: Product Creation Request ===');
    console.log('Request body:', { name, description, price, category, stock });
    console.log('Files received:', req.files?.length || 0);
    if (req.files && req.files.length > 0) {
      console.log('File details:', req.files.map(f => ({
        filename: f.filename,
        path: f.path,
        size: f.size,
        mimetype: f.mimetype
      })));
    }

    // Basic validation
    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and category are required fields.',
      });
    }

    // Handle images - either from file upload or URLs from body
    let imageUrls = [];
    
    if (req.files && req.files.length > 0) {
      // Images uploaded as files - store file paths
      imageUrls = req.files.map(file => `/${file.path.replace(/\\/g, '/')}`);
      console.log('Image URLs generated:', imageUrls);
    } else if (req.body.images) {
      // Images provided as URLs (for backward compatibility or external URLs)
      imageUrls = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
      console.log('Using provided URLs:', imageUrls);
    }

    if (imageUrls.length === 0) {
      console.error('No images provided!');
      return res.status(400).json({
        success: false,
        message: 'At least one product image is required.',
      });
    }

    // Create product with pending approval status
    const product = await Product.create({
      name,
      description,
      price,
      category,
      stock,
      images: imageUrls,
      vendor: req.user.id, // vendor from auth middleware
      approvalStatus: 'Pending',
      isApproved: false,
    });

    console.log('Product created successfully:', {
      id: product._id,
      name: product.name,
      images: product.images,
      vendor: product.vendor
    });
    console.log('=== BACKEND: Product Creation Complete ===');

    res.status(201).json({
      success: true,
      message: 'Product created successfully and submitted for admin approval',
      data: product,
    });
  } catch (error) {
    console.error('BACKEND ERROR:', error);
    // Clean up uploaded files if product creation fails
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    next(error);
  }
};

// @desc    Get all products (Public) with advanced search, filters, and pagination
// @route   GET /api/products
// @access  Public
exports.getAllProducts = async (req, res, next) => {
  try {
    const {
      category,
      search,
      sortBy,
      minPrice,
      maxPrice,
      minRating,
      vendor,
      inStock,
      page = 1,
      limit = 8,
    } = req.query;

    const normalizedSearch = typeof search === 'string' ? search.trim() : '';

    let filter = {};

    // Only show approved products to public
    filter.isApproved = true;
    filter.approvalStatus = 'Approved';

    // Advanced filtering logic
    if (category) filter.category = category;

    // PERFORMANCE: Use MongoDB text search instead of regex for better performance
    if (normalizedSearch) {
      filter.$text = { $search: normalizedSearch };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {
        ...(minPrice && { $gte: Number(minPrice) }),
        ...(maxPrice && { $lte: Number(maxPrice) }),
      };
    }

    // Rating filter
    if (minRating) {
      filter.rating = { $gte: Number(minRating) };
    }

    // Vendor filter
    if (vendor) {
      filter.vendor = vendor;
    }

    // Stock filter
    if (inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const startIndex = (pageNum - 1) * limitNum;

    // PERFORMANCE: Determine sort criteria
    let sortCriteria;
    switch (sortBy) {
      case 'price_asc':
        sortCriteria = { price: 1 };
        break;
      case 'price_desc':
        sortCriteria = { price: -1 };
        break;
      case 'rating_desc':
        sortCriteria = { rating: -1 };
        break;
      case 'rating_asc':
        sortCriteria = { rating: 1 };
        break;
      case 'name_asc':
        sortCriteria = { name: 1 };
        break;
      case 'name_desc':
        sortCriteria = { name: -1 };
        break;
      case 'newest':
        sortCriteria = { createdAt: -1 };
        break;
      case 'oldest':
        sortCriteria = { createdAt: 1 };
        break;
      default:
        // Default: Show newest products first (on page 1)
        sortCriteria = { createdAt: -1 };
    }

    // PERFORMANCE: If text search, add textScore to sort
    if (normalizedSearch) {
      sortCriteria = { score: { $meta: 'textScore' }, ...sortCriteria };
    }

    // PERFORMANCE: Use Promise.all to run queries in parallel
    const [products, total] = await Promise.all([
      Product.find(filter)
        .select('name description price category stock images rating numReviews createdAt vendor')
        .sort(sortCriteria)
        .skip(startIndex)
        .limit(limitNum)
        .lean() // PERFORMANCE: Returns plain JS objects instead of Mongoose documents (faster)
        .exec(),
      Product.countDocuments(filter).exec()
    ]);

    // Pagination metadata
    const pagination = {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total,
      itemsPerPage: limitNum,
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
    };

    res.status(200).json({
      success: true,
      count: products.length,
      pagination,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('vendor', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product (Vendor/Admin)
// @route   PUT /api/products/:id
// @access  Private (Vendor/Admin)
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Authorization check: vendor or admin
    if (req.user.role !== 'admin' && product.vendor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product',
      });
    }

    // Update fields
    const fieldsToUpdate = req.body;
    Object.assign(product, fieldsToUpdate);

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product (Vendor/Admin)
// @route   DELETE /api/products/:id
// @access  Private (Vendor/Admin)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Authorization check
    if (req.user.role !== 'admin' && product.vendor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product',
      });
    }

    // Clean up uploaded image files (only local uploads, not external URLs)
    if (product.images && product.images.length > 0) {
      product.images.forEach(imagePath => {
        // Only delete files from our uploads directory
        if (imagePath.startsWith('/uploads/products/')) {
          const fullPath = path.join(__dirname, '..', imagePath);
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (err) {
              console.error('Error deleting image file:', err);
            }
          }
        }
      });
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vendor's own products
// @route   GET /api/products/vendor
// @access  Private (Vendor)
exports.getVendorProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ vendor: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all products for admin (including pending)
// @route   GET /api/products/admin/all
// @access  Private (Admin)
exports.getAllProductsAdmin = async (req, res, next) => {
  try {
    const products = await Product.find()
      .populate('vendor', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/Reject product (Admin)
// @route   PUT /api/products/:id/approve
// @access  Private (Admin)
exports.approveProduct = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"',
      });
    }

    // If rejecting, require a reason
    if (action === 'reject' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting a product',
      });
    }

    if (action === 'approve') {
      product.approvalStatus = 'Approved';
      product.isApproved = true;
      product.approvedBy = req.user.id;
      product.approvedAt = new Date();
      product.rejectionReason = '';
    } else {
      product.approvalStatus = 'Rejected';
      product.isApproved = false;
      product.rejectionReason = rejectionReason;
      product.approvedBy = req.user.id;
      product.approvedAt = new Date();
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: `Product ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload 3D Model for Product (Vendor)
// @route   POST /api/products/:id/upload-3d-model
// @access  Private (Vendor)
exports.upload3DModel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { glbFile, usdzFile, dimensions } = req.body;

    // Find product
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Authorization check: only product owner vendor can upload
    if (product.vendor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload 3D model for this product',
      });
    }

    // Validate at least GLB file is provided
    if (!glbFile) {
      return res.status(400).json({
        success: false,
        message: '3D Model file (.glb) is required',
      });
    }

    // Update product with 3D model data
    product.model3D = {
      glbFile,
      usdzFile: usdzFile || null,
      thumbnailAR: null, // Can be generated later
      fileSize: 0, // Will be calculated
      isARReady: true,
      dimensions: {
        length: dimensions?.length || 0,
        width: dimensions?.width || 0,
        height: dimensions?.height || 0,
      },
      uploadedAt: new Date(),
    };

    await product.save();

    res.status(200).json({
      success: true,
      message: '3D Model uploaded successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete 3D Model from Product (Vendor)
// @route   DELETE /api/products/:id/3d-model
// @access  Private (Vendor)
exports.delete3DModel = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Authorization check
    if (product.vendor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete 3D model for this product',
      });
    }

    // Reset 3D model fields
    product.model3D = {
      glbFile: null,
      usdzFile: null,
      thumbnailAR: null,
      fileSize: 0,
      isARReady: false,
      dimensions: {
        length: 0,
        width: 0,
        height: 0,
      },
      uploadedAt: null,
    };

    await product.save();

    res.status(200).json({
      success: true,
      message: '3D Model deleted successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};
