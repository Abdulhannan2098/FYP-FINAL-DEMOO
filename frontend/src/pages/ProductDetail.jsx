import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import StarRating from '../components/StarRating';
import ChatButton from '../components/chat/ChatButton.jsx';
// Import the new Accurate AR Viewer (replaces AdvancedARViewer)
import { AccurateARViewer } from '../ar';
// Legacy import kept for reference - can be removed after testing
// import AdvancedARViewer from '../components/ar/AdvancedARViewer';
import { getPlaceholderImage } from '../utils/constants';
import { formatPKR } from '../utils/currency';

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showARViewer, setShowARViewer] = useState(false);

  useEffect(() => {
    fetchProductDetails();
    fetchReviews();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data.data);
    } catch (error) {
      console.error('Failed to load product', error);
      showToast('Failed to load product', 'error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await api.get(`/reviews/${id}`);
      setReviews(response.data.data);
    } catch (error) {
      console.error('Failed to load reviews', error);
    }
  };

  const handleAddToCart = () => {
    if (!user) {
      showToast('Please login to add items to cart', 'warning');
      navigate('/login');
      return;
    }

    addToCart(product, quantity);
    showToast(`Added ${quantity} ${product.name} to cart!`, 'success');
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!user) {
      showToast('Please login to submit a review', 'warning');
      navigate('/login');
      return;
    }

    if (!reviewForm.comment.trim()) {
      showToast('Please provide a comment', 'warning');
      return;
    }

    setSubmittingReview(true);
    try {
      await api.post(`/reviews/${id}`, {
        rating: reviewForm.rating,
        comment: reviewForm.comment
      });

      showToast('Review submitted successfully!', 'success');
      setShowReviewForm(false);
      setReviewForm({ rating: 5, comment: '' });
      fetchReviews();
      fetchProductDetails(); // Refresh to get updated rating
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getRatingBreakdown = () => {
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      breakdown[review.rating]++;
    });
    return breakdown;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-900 py-16">
        <LoadingSpinner size="lg" message="Loading product details..." />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-secondary-900 py-16">
        <div className="container-custom text-center">
          <h2 className="heading-2">Product not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-900 py-16">
      <div className="container-custom">
        {/* Breadcrumb */}
        <nav className="mb-10">
          <ol className="flex items-center space-x-2 text-sm text-text-secondary">
            <li>
              <a href="/" className="hover:text-primary-500 transition-colors">Home</a>
            </li>
            <li>/</li>
            <li>
              <a href="/products" className="hover:text-primary-500 transition-colors">Products</a>
            </li>
            <li>/</li>
            <li className="text-text-primary font-semibold">{product.name}</li>
          </ol>
        </nav>

        {/* Product Detail Card */}
        <div className="card">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Product Image */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative w-full h-96 bg-surface-light rounded-xl overflow-hidden group">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0].startsWith('http') ? product.images[0] : `http://localhost:5000${product.images[0]}`}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = getPlaceholderImage(product.category);
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-32 h-32 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                {product.isApproved && (
                  <div className="absolute top-4 left-4">
                    <span className="badge badge-success shadow-medium">Verified</span>
                  </div>
                )}
              </div>

              {/* Thumbnail Images */}
              {product.images && product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {product.images.slice(1, 5).map((image, index) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden border border-surface-light hover:border-primary-500 transition-all cursor-pointer">
                      <img
                        src={image.startsWith('http') ? image : `http://localhost:5000${image}`}
                        alt={`${product.name} - ${index + 2}`}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getPlaceholderImage(product.category);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Category Badge */}
              <div>
                <span className="px-4 py-2 bg-primary-900/30 border border-primary-500 text-primary-500 rounded-lg text-sm font-bold uppercase tracking-wider">
                  {product.category}
                </span>
              </div>

              {/* Title */}
              <h1 className="font-display text-4xl font-bold text-text-primary tracking-tight">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <StarRating rating={product.rating ||0} size="lg" showCount reviewCount={product.numReviews || 0} />
                {product.rating > 0 && (
                  <span className="text-lg font-bold text-text-primary">{product.rating.toFixed(1)}</span>
                )}
              </div>

              {/* Price */}
              <div>
                <p className="font-display text-5xl font-bold text-primary-500">
                  {formatPKR(product.price)}
                </p>
              </div>

              {/* Stock Status */}
              <div>
                {product.stock > 0 ? (
                  <p className="text-green-400 font-semibold flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    In Stock ({product.stock} available)
                  </p>
                ) : (
                  <p className="text-primary-500 font-semibold flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Out of Stock
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="border-t border-b border-surface-light py-6">
                <h3 className="text-lg font-bold text-text-primary mb-4">Description</h3>
                <p className="text-text-secondary leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Vendor Info */}
              {product.vendor && (
                <div className="bg-surface-light rounded-lg p-5 border border-surface-light">
                  <h3 className="text-sm font-bold text-text-secondary mb-3">Published by</h3>
                  <p className="text-text-primary font-bold text-lg">{product.vendor.name}</p>
                  <p className="text-sm text-text-tertiary mt-1">{product.vendor.email}</p>
                </div>
              )}

              {/* Quantity Selector & Add to Cart */}
              {user?.role === 'vendor' ? (
                <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-blue-400 font-semibold mb-1">Vendor Account</h4>
                      <p className="text-blue-300 text-sm">As a vendor, you cannot purchase products. This page is for viewing product details only.</p>
                    </div>
                  </div>
                </div>
              ) : product.stock > 0 ? (
                <div className="space-y-5">
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-bold text-text-primary">Quantity:</label>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-11 h-11 rounded-lg border border-surface-light bg-surface-light hover:bg-surface-lighter hover:border-primary-500 flex items-center justify-center transition-all duration-200"
                      >
                        <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="font-display text-2xl font-bold text-text-primary w-14 text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        className="w-11 h-11 rounded-lg border border-surface-light bg-surface-light hover:bg-surface-lighter hover:border-primary-500 flex items-center justify-center transition-all duration-200"
                      >
                        <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={handleAddToCart}
                      className="btn-primary flex items-center justify-center space-x-2 text-lg py-4"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>Add to Cart</span>
                    </button>

                    <button
                      onClick={() => {
                        if (product.model3D?.isARReady) {
                          setShowARViewer(true);
                        } else {
                          showToast('3D Model not available for this product', 'info');
                        }
                      }}
                      disabled={!product.model3D?.isARReady}
                      className={`${
                        product.model3D?.isARReady
                          ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 hover:shadow-purple-500/30'
                          : 'bg-gray-600 cursor-not-allowed opacity-50'
                      } text-white px-6 py-4 rounded-lg font-semibold shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 text-lg border-2 ${
                        product.model3D?.isARReady ? 'border-purple-500/50' : 'border-gray-500/50'
                      }`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {product.model3D?.isARReady ? (
                          <>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </>
                        ) : (
                          <>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </>
                        )}
                      </svg>
                      <span>{product.model3D?.isARReady ? 'AR Preview' : '3D Model Not Available'}</span>
                    </button>
                  </div>

                  {/* Chat with Vendor Button */}
                  <ChatButton product={product} />
                </div>
              ) : null}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-12 pt-12 border-t border-surface-light">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-display font-bold text-text-primary">Customer Reviews</h3>
              {user?.role === 'customer' && (
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-4 py-2 bg-gradient-to-r from-primary-800 to-primary-700 hover:from-primary-700 hover:to-primary-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Write a Review</span>
                </button>
              )}
            </div>

            {/* Review Form */}
            {showReviewForm && (
              <form onSubmit={handleSubmitReview} className="mb-8 bg-surface border border-surface-light rounded-xl p-6">
                <h4 className="text-lg font-bold text-text-primary mb-4">Share Your Experience</h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Your Rating</label>
                    <StarRating
                      rating={reviewForm.rating}
                      size="xl"
                      interactive
                      onChange={(rating) => setReviewForm({...reviewForm, rating})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Your Review</label>
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                      className="input-field min-h-[120px]"
                      placeholder="Tell us what you think about this product..."
                      maxLength={500}
                      required
                    />
                    <p className="text-xs text-text-tertiary mt-1">{reviewForm.comment.length}/500 characters</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="px-6 py-2.5 bg-gradient-to-r from-primary-800 to-primary-700 hover:from-primary-700 hover:to-primary-600 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
                    >
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="px-6 py-2.5 bg-surface-light hover:bg-surface-lighter text-text-primary rounded-lg font-medium transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Rating Breakdown */}
            {reviews.length > 0 && (
              <div className="mb-8 grid md:grid-cols-2 gap-8">
                {/* Overall Rating */}
                <div className="bg-surface border border-surface-light rounded-xl p-6">
                  <div className="text-center">
                    <p className="text-6xl font-display font-bold bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 bg-clip-text text-transparent mb-2">
                      {product.rating.toFixed(1)}
                    </p>
                    <StarRating rating={product.rating} size="lg" />
                    <p className="text-text-secondary mt-2">Based on {product.numReviews} {product.numReviews === 1 ? 'review' : 'reviews'}</p>
                  </div>
                </div>

                {/* Rating Distribution */}
                <div className="bg-surface border border-surface-light rounded-xl p-6">
                  <h4 className="font-bold text-text-primary mb-4">Rating Distribution</h4>
                  {Object.keys(getRatingBreakdown()).sort((a, b) => b - a).map((rating) => {
                    const count = getRatingBreakdown()[rating];
                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;

                    return (
                      <div key={rating} className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-text-secondary w-8">{rating}★</span>
                        <div className="flex-1 h-2 bg-surface-light rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-text-tertiary w-12 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews List */}
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review._id} className="bg-surface border border-surface-light rounded-xl p-6 hover:border-primary-500/30 transition-all duration-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-800 to-primary-700 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">{review.customer.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-bold text-text-primary">{review.customer.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <StarRating rating={review.rating} size="sm" />
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-text-tertiary">
                        {new Date(review.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <p className="text-text-secondary leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-surface border border-surface-light rounded-xl">
                <svg className="w-16 h-16 text-text-tertiary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <h4 className="text-lg font-bold text-text-primary mb-2">No Reviews Yet</h4>
                <p className="text-text-secondary">Be the first to review this product!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accurate AR Viewer Modal - Upgraded with smart car detection */}
      {showARViewer && (
        <AccurateARViewer
          product={product}
          onClose={() => setShowARViewer(false)}
        />
      )}
    </div>
  );
};

export default ProductDetail;
