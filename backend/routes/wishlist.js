const express = require('express');
const router = express.Router();
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  checkInWishlist,
} = require('../controllers/wishlistController');
const { protect } = require('../middlewares/authMiddleware');

// All wishlist routes require authentication
router.use(protect);

// Get wishlist
router.get('/', getWishlist);

// Clear wishlist
router.delete('/', clearWishlist);

// Check if product is in wishlist
router.get('/check/:productId', checkInWishlist);

// Add to wishlist
router.post('/:productId', addToWishlist);

// Remove from wishlist
router.delete('/:productId', removeFromWishlist);

module.exports = router;
