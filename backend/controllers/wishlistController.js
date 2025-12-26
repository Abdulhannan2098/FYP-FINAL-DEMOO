const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
exports.getWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user.id })
      .populate({
        path: 'products.product',
        select: 'name description price images category stock averageRating vendor',
        populate: {
          path: 'vendor',
          select: 'name',
        },
      });

    // Create wishlist if it doesn't exist
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user.id, products: [] });
    }

    res.status(200).json({
      success: true,
      data: {
        wishlist,
        count: wishlist.products.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add product to wishlist
// @route   POST /api/wishlist/:productId
// @access  Private
exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user.id, products: [] });
    }

    // Add product
    await wishlist.addProduct(productId);

    // Populate and return
    wishlist = await Wishlist.findOne({ user: req.user.id })
      .populate({
        path: 'products.product',
        select: 'name description price images category stock averageRating vendor',
        populate: {
          path: 'vendor',
          select: 'name',
        },
      });

    res.status(200).json({
      success: true,
      message: 'Product added to wishlist',
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found',
      });
    }

    await wishlist.removeProduct(productId);

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear entire wishlist
// @route   DELETE /api/wishlist
// @access  Private
exports.clearWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found',
      });
    }

    await wishlist.clearAll();

    res.status(200).json({
      success: true,
      message: 'Wishlist cleared successfully',
      data: wishlist,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if product is in wishlist
// @route   GET /api/wishlist/check/:productId
// @access  Private
exports.checkInWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user.id });
    const inWishlist = wishlist ? wishlist.hasProduct(productId) : false;

    res.status(200).json({
      success: true,
      data: {
        inWishlist,
      },
    });
  } catch (error) {
    next(error);
  }
};
