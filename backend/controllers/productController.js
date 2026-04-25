const Product = require('../models/Product');
const AIFeedback = require('../models/AIFeedback');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const { uploadBuffer } = require('../utils/cloudinaryUpload');
const { sendVendorProductApprovedEmail, sendVendorProductRejectedEmail, sendVendorProductDeletedEmail } = require('../utils/emailService');
const { validateProduct: aiValidateProduct } = require('../services/productAIValidator');

// ── Duplicate submission guard ──────────────────────────────────────────────
// In-memory set of "vendor:normalised-name" keys with a 15-second TTL.
// This prevents double-clicks or rapid re-submits from creating duplicates.
const _recentSubmissions = new Map(); // key → expiresAt (ms)
const DEDUP_TTL_MS = 15_000;

function isDuplicateSubmission(vendorId, productName) {
  const key = `${vendorId}:${productName.trim().toLowerCase()}`;
  const now = Date.now();

  // Purge expired entries
  for (const [k, exp] of _recentSubmissions) {
    if (exp <= now) _recentSubmissions.delete(k);
  }

  if (_recentSubmissions.has(key)) return true;

  _recentSubmissions.set(key, now + DEDUP_TTL_MS);
  return false;
}

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

const normalizeModel3DValue = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const mergeModel3D = (currentModel = {}, updates = {}) => {
  const nextModel = {
    ...currentModel,
  };

  if (Object.prototype.hasOwnProperty.call(updates, 'glbFile')) {
    nextModel.glbFile = normalizeModel3DValue(updates.glbFile);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'usdzFile')) {
    nextModel.usdzFile = normalizeModel3DValue(updates.usdzFile);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'thumbnailAR')) {
    nextModel.thumbnailAR = normalizeModel3DValue(updates.thumbnailAR);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'fileSize')) {
    nextModel.fileSize = Number(updates.fileSize) || 0;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'dimensions')) {
    const dimensions = updates.dimensions || {};
    nextModel.dimensions = {
      length: Number(dimensions.length) || 0,
      width: Number(dimensions.width) || 0,
      height: Number(dimensions.height) || 0,
    };
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'uploadedAt')) {
    nextModel.uploadedAt = updates.uploadedAt ? new Date(updates.uploadedAt) : nextModel.uploadedAt;
  }

  nextModel.isARReady = Boolean(nextModel.glbFile);

  return nextModel;
};

// Use memory storage — Vercel's filesystem is read-only; images are uploaded to Cloudinary.
exports.uploadProductImages = multer({
  storage: multer.memoryStorage(),
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

    // ── Duplicate submission guard ──────────────────────────────────────────
    if (isDuplicateSubmission(req.user.id, name)) {
      return res.status(429).json({
        success: false,
        message: 'Duplicate submission detected. Your product was already received — please wait a moment before trying again.',
      });
    }

    // Handle images — upload buffers to Cloudinary or accept pre-supplied URLs
    let imageUrls = [];

    if (req.files && req.files.length > 0) {
      const uploads = await Promise.all(
        req.files.map(file =>
          uploadBuffer(file.buffer, {
            folder: 'autosphere/products',
            resource_type: 'image',
          })
        )
      );
      imageUrls = uploads.map(result => result.secure_url);
      console.log('Image URLs generated (Cloudinary):', imageUrls);
    } else if (req.body.images) {
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

    // ── AI Validation (3-layer hybrid engine) ───────────────────────────────
    const aiResult = aiValidateProduct(name, description || '', category);
    const {
      decision:        aiDecision,
      confidenceScore: aiConfidenceScore,
      reason:          aiReason,       // technical — admin only
      vendorMessage:   aiVendorMessage, // clean policy message — shown to vendor
      layers:          aiLayers,
    } = aiResult;

    // Map AI decision to approval fields
    let approvalStatus = 'Pending';
    let isApproved = false;
    // Store the clean vendor message as rejectionReason so vendor email + UI
    // always display policy-friendly language (admin sees aiReason separately).
    let rejectionReason = '';

    if (aiDecision === 'auto_approved') {
      approvalStatus = 'Approved';
      isApproved = true;
    } else if (aiDecision === 'auto_rejected') {
      approvalStatus = 'Rejected';
      isApproved = false;
      rejectionReason = aiVendorMessage; // clean message stored for vendor
    }
    // pending_review → stays 'Pending'

    console.log('AI Validation result:', { aiDecision, aiConfidenceScore, layers: aiLayers });

    // Create product with AI-determined approval status
    const product = await Product.create({
      name,
      description,
      price,
      category,
      stock,
      images: imageUrls,
      vendor: req.user.id,
      approvalStatus,
      isApproved,
      rejectionReason,
      aiReviewed: true,
      aiDecision,
      aiConfidenceScore,
      aiReason,
    });

    // Send email notifications for automated decisions
    try {
      const vendorUser = req.user;
      if (aiDecision === 'auto_approved') {
        await sendVendorProductApprovedEmail(
          vendorUser.email,
          vendorUser.name || 'Vendor',
          product.name,
          product._id
        );
      } else if (aiDecision === 'auto_rejected') {
        await sendVendorProductRejectedEmail(
          vendorUser.email,
          vendorUser.name || 'Vendor',
          product.name,
          product._id,
          aiReason
        );
      }
    } catch (emailErr) {
      console.error('AI decision email notification failed (non-blocking):', emailErr.message);
    }

    console.log('Product created successfully:', {
      id: product._id,
      name: product.name,
      images: product.images,
      vendor: product.vendor,
      aiDecision,
      approvalStatus,
    });
    console.log('=== BACKEND: Product Creation Complete ===');

    const messageMap = {
      auto_approved: 'Product submitted and automatically approved — it is now live!',
      auto_rejected: 'Product submitted but could not be approved: ' + aiReason,
      pending_review: 'Product submitted and flagged for manual admin review.',
    };

    res.status(201).json({
      success: true,
      message: messageMap[aiDecision] || 'Product created successfully and submitted for admin approval',
      data: product,
    });
  } catch (error) {
    console.error('BACKEND ERROR:', error);
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
      vendorId,
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

    // Vendor filter (backward compatible: supports vendorId and legacy vendor)
    const vendorFilter = vendorId || vendor;
    if (vendorFilter) {
      if (!mongoose.Types.ObjectId.isValid(vendorFilter)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendorId. Please provide a valid vendor identifier.',
          errors: [
            {
              field: 'vendorId',
              message: 'Must be a valid ObjectId',
            },
          ],
        });
      }

      filter.vendor = vendorFilter;
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
    const fieldsToUpdate = { ...req.body };

    if (fieldsToUpdate.model3D) {
      product.model3D = mergeModel3D(product.model3D || {}, fieldsToUpdate.model3D);
      delete fieldsToUpdate.model3D;
    }

    Object.assign(product, fieldsToUpdate);

    if (product.model3D) {
      product.model3D.isARReady = Boolean(product.model3D.glbFile);
    }

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
    const product = await Product.findById(req.params.id).populate('vendor', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Authorization check
    if (req.user.role !== 'admin' && product.vendor._id?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product',
      });
    }

    // Send deletion email notification when ADMIN deletes the product
    if (req.user.role === 'admin') {
      const vendorEmail = product.vendor?.email;

      if (!vendorEmail) {
        console.error('Product deleted by admin but vendor email is missing. Email notification skipped.', {
          productId: product._id,
          vendorId: product.vendor?._id,
        });
      } else {
        const emailResult = await sendVendorProductDeletedEmail(
          vendorEmail,
          product.vendor?.name || 'Vendor',
          product.name,
          product._id
        );

        if (!emailResult?.success) {
          console.error('Product deletion email failed to send.', {
            productId: product._id,
            vendorEmail,
            error: emailResult?.error || 'Unknown email error',
          });
        }
      }
    }

    // Images are stored on Cloudinary — no local file cleanup needed.

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
    const product = await Product.findById(req.params.id).populate('vendor', 'name email');

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

    if (action === 'approve') {
      const vendorEmail = product.vendor?.email;

      if (!vendorEmail) {
        console.error('Product approved but vendor email is missing. Email notification skipped.', {
          productId: product._id,
          vendorId: product.vendor?._id || product.vendor,
        });
      } else {
        const emailResult = await sendVendorProductApprovedEmail(
          vendorEmail,
          product.vendor?.name || 'Vendor',
          product.name,
          product._id
        );

        if (!emailResult?.success) {
          console.error('Product approval email failed to send.', {
            productId: product._id,
            vendorEmail,
            error: emailResult?.error || 'Unknown email error',
          });
        }
      }
    } else if (action === 'reject') {
      const vendorEmail = product.vendor?.email;

      if (!vendorEmail) {
        console.error('Product rejected but vendor email is missing. Email notification skipped.', {
          productId: product._id,
          vendorId: product.vendor?._id || product.vendor,
        });
      } else {
        const emailResult = await sendVendorProductRejectedEmail(
          vendorEmail,
          product.vendor?.name || 'Vendor',
          product.name,
          product._id,
          rejectionReason
        );

        if (!emailResult?.success) {
          console.error('Product rejection email failed to send.', {
            productId: product._id,
            vendorEmail,
            error: emailResult?.error || 'Unknown email error',
          });
        }
      }
    }

    // ── Feedback loop: log admin decision for future model improvement ────────
    if (product.aiReviewed && product.aiDecision) {
      const aiActionEquivalent = action === 'approve' ? 'auto_approved' : 'auto_rejected';
      const wasOverride        = product.aiDecision !== aiActionEquivalent;

      AIFeedback.create({
        product:              product._id,
        productName:          product.name,
        productDescription:   product.description || '',
        productCategory:      product.category    || '',
        aiDecision:           product.aiDecision,
        aiConfidenceScore:    product.aiConfidenceScore ?? 0,
        aiReason:             product.aiReason    || '',
        adminAction:          action,
        adminRejectionReason: action === 'reject' ? (rejectionReason || '') : '',
        adminId:              req.user.id,
        wasOverride,
      }).catch((err) =>
        console.error('AIFeedback log failed (non-blocking):', err.message)
      );
    }

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

    const currentModel3D = product.model3D || {};
    const hasExistingModel = Boolean(currentModel3D.glbFile || currentModel3D.usdzFile || currentModel3D.isARReady);

    // Validate at least GLB file is provided when creating a new 3D model
    if (!hasExistingModel && !glbFile) {
      return res.status(400).json({
        success: false,
        message: '3D Model file (.glb) is required',
      });
    }

    // Update product with 3D model data without overwriting untouched fields
    product.model3D = mergeModel3D(currentModel3D, {
      glbFile: Object.prototype.hasOwnProperty.call(req.body, 'glbFile') ? glbFile : currentModel3D.glbFile,
      usdzFile: Object.prototype.hasOwnProperty.call(req.body, 'usdzFile') ? usdzFile : currentModel3D.usdzFile,
      dimensions: Object.prototype.hasOwnProperty.call(req.body, 'dimensions') ? dimensions : currentModel3D.dimensions,
      uploadedAt: currentModel3D.uploadedAt || new Date(),
    });

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
