import { useWishlist } from '../context/WishlistContext';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { getPlaceholderImage } from '../utils/constants';
import StarRating from '../components/StarRating';
import { formatPKR } from '../utils/currency';
import { resolveImageUrl } from '../utils/imageHelper';

const Wishlist = () => {
  const { wishlist, loading, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const handleAddToCart = (product) => {
    addToCart(product, 1);
    showToast(`${product.name} added to cart!`, 'success');
  };

  const handleRemove = async (productId) => {
    await removeFromWishlist(productId);
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear your entire wishlist?')) {
      await clearWishlist();
    }
  };

  if (loading) {
    return (
      <div className="container-custom py-12">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold text-text-primary mb-2">
            My Wishlist
          </h1>
          <p className="text-text-tertiary">
            {wishlist.length === 0 ? 'No items' : `${wishlist.length} ${wishlist.length === 1 ? 'item' : 'items'}`} in your wishlist
          </p>
        </div>
        {wishlist.length > 0 && (
          <button
            onClick={handleClearAll}
            className="btn btn-outline-error flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Empty State */}
      {wishlist.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-24 h-24 mx-auto text-gray-300 mb-6" />
          <h2 className="text-2xl font-bold text-text-primary mb-3">Your wishlist is empty</h2>
          <p className="text-text-tertiary mb-8">
            Save items you love and they'll appear here
          </p>
          <Link to="/products" className="btn btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Browse Products
          </Link>
        </div>
      ) : (
        /* Wishlist Items */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.map((item) => {
            const product = item.product;
            const rawImage = product?.images?.[0];
            const productImage = rawImage ? resolveImageUrl(rawImage) : getPlaceholderImage(product?.category);

            return (
              <div key={item._id} className="card-hover group relative">
                {/* Remove Button */}
                <button
                  onClick={() => handleRemove(product._id)}
                  className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-red-50 transition-all duration-200 shadow-medium hover:scale-110"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>

                <Link to={`/product/${product._id}`}>
                  {/* Product Image */}
                  <div className="relative w-full h-52 bg-surface-light rounded-lg mb-4 overflow-hidden">
                    <img
                      src={productImage}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.src = getPlaceholderImage(product?.category);
                      }}
                    />
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

                    {/* Price */}
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

                {/* Add to Cart Button */}
                {product.stock > 0 && (
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="btn btn-primary w-full mt-4 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Add to Cart
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
