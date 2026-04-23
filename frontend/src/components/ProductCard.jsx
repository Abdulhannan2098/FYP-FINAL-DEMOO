import { memo } from 'react';
import { Link } from 'react-router-dom';
import { getPlaceholderImage } from '../utils/constants';
import { formatPKR } from '../utils/currency';
import StarRating from './StarRating';
import { useWishlist } from '../context/WishlistContext';
import { Heart } from 'lucide-react';
import { resolveImageUrl } from '../utils/imageHelper';

// PERFORMANCE: Memoize ProductCard to prevent unnecessary re-renders
const ProductCard = memo(({ product }) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const inWishlist = isInWishlist(product._id);

  const productImage = product.images && product.images.length > 0
    ? resolveImageUrl(product.images[0])
    : getPlaceholderImage(product.category);

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product._id);
  };

  return (
    <div className="card-hover group relative">
      {/* Wishlist Button */}
      <button
        onClick={handleWishlistClick}
        className="absolute top-3 left-3 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-all duration-200 shadow-medium hover:scale-110"
        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart
          className={`w-5 h-5 transition-colors duration-200 ${
            inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600 hover:text-red-500'
          }`}
        />
      </button>

      <Link to={`/product/${product._id}`}>
        {/* Product Image */}
        <div className="relative w-full h-52 bg-surface-light rounded-lg mb-4 overflow-hidden">
        <img
          src={productImage}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            e.target.src = getPlaceholderImage(product.category);
          }}
        />
        {product.isApproved && (
          <span className="absolute top-3 right-3 badge badge-success text-xs shadow-medium">
            Verified
          </span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm">
            <span className="text-white font-bold text-sm tracking-wider">OUT OF STOCK</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-3">
        <span className="text-xs text-primary-500 font-bold uppercase tracking-wider">
          {product.category}
        </span>
        <h3 className="text-lg font-bold text-text-primary group-hover:text-primary-500 transition-colors duration-200 line-clamp-2 leading-snug">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1">
          <StarRating
            rating={product.rating || 0}
            size="sm"
            showCount
            reviewCount={product.numReviews || 0}
          />
        </div>

        {/* Price & Stock */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-light">
          <p className="font-display text-2xl font-bold text-primary-500">
            {formatPKR(product.price)}
          </p>
          {product.stock > 0 && (
            <span className="text-xs text-text-tertiary font-medium">
              {product.stock} in stock
            </span>
          )}
        </div>
      </div>
      </Link>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
