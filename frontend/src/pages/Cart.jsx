import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatPKR } from '../utils/currency';
import { getPlaceholderImage } from '../utils/constants';
import { resolveImageUrl } from '../utils/imageHelper';

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart, getCartByVendor, getVendorCount } = useCart();
  const { user } = useAuth();

  const vendorGroups = getCartByVendor();

  if (!user) {
    return (
      <div className="min-h-screen bg-secondary-900 py-16">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center py-24">
            <svg className="w-24 h-24 text-text-tertiary mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h2 className="heading-2 mb-4">Please Login</h2>
            <p className="text-body mb-8">You need to be logged in to view your cart</p>
            <Link to="/login" className="btn-primary">
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-secondary-900 py-16">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center py-24">
            <svg className="w-24 h-24 text-text-tertiary mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="heading-2 mb-4">Your Cart is Empty</h2>
            <p className="text-body mb-8">Start adding products to your cart!</p>
            <Link to="/products" className="btn-primary">
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-900 py-16">
      <div className="container-custom">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <h1 className="heading-1 mb-3">Shopping Cart</h1>
            <p className="text-body">
              {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} from {getVendorCount()} vendor{getVendorCount() !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items - Grouped by Vendor */}
            <div className="lg:col-span-2 space-y-8">
              {vendorGroups.map((vendorGroup) => (
                <div key={vendorGroup.vendorId} className="space-y-4">
                  {/* Vendor Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-primary-500/30">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <div>
                        <h3 className="font-display text-xl font-bold text-text-primary">{vendorGroup.vendorName}</h3>
                        <p className="text-sm text-text-tertiary">{vendorGroup.items.length} item{vendorGroup.items.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-tertiary mb-1">Vendor Subtotal</p>
                      <p className="font-display text-lg font-bold text-primary-500">{formatPKR(vendorGroup.subtotal)}</p>
                    </div>
                  </div>

                  {/* Vendor Items */}
                  <div className="space-y-4">
                    {vendorGroup.items.map((item) => (
                      <div key={item.product._id} className="card">
                        <div className="flex gap-6">
                          {/* Product Image */}
                          <div className="w-32 h-32 bg-surface-light rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <img
                              src={
                                item.product?.images?.[0]
                                  ? resolveImageUrl(item.product.images[0])
                                  : getPlaceholderImage(item.product?.category)
                              }
                              alt={item.product?.name || 'Product'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = getPlaceholderImage(item.product?.category);
                              }}
                            />
                          </div>

                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/product/${item.product._id}`}
                              className="text-lg font-bold text-text-primary hover:text-primary-500 transition-colors"
                            >
                              {item.product.name}
                            </Link>
                            <p className="text-sm text-text-tertiary mt-1">{item.product.category}</p>
                            <p className="font-display text-2xl font-bold text-primary-500 mt-3">
                              {formatPKR(item.product.price)}
                            </p>

                            {/* Quantity Controls */}
                            <div className="flex items-center space-x-4 mt-4">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  className="w-9 h-9 rounded-lg border border-surface-light hover:bg-surface-light hover:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                  <svg className="w-4 h-4 mx-auto text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                  </svg>
                                </button>
                                <span className="text-lg font-bold text-text-primary w-10 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                                  disabled={item.quantity >= item.product.stock}
                                  className="w-9 h-9 rounded-lg border border-surface-light hover:bg-surface-light hover:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                  <svg className="w-4 h-4 mx-auto text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                              </div>

                              <button
                                onClick={() => removeFromCart(item.product._id)}
                                className="text-primary-500 hover:text-primary-400 text-sm font-semibold transition-colors flex items-center space-x-1.5"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Remove</span>
                              </button>
                            </div>

                            {/* Stock Warning */}
                            {item.quantity >= item.product.stock && (
                              <p className="text-sm text-yellow-400 mt-3 font-medium">
                                Maximum stock reached ({item.product.stock} available)
                              </p>
                            )}
                          </div>

                          {/* Subtotal */}
                          <div className="text-right">
                            <p className="text-sm text-text-tertiary mb-2">Subtotal</p>
                            <p className="font-display text-xl font-bold text-text-primary">
                              {formatPKR(item.product.price * item.quantity)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Clear Cart Button */}
              <button
                onClick={clearCart}
                className="text-primary-500 hover:text-primary-400 text-sm font-semibold transition-colors"
              >
                Clear Cart
              </button>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="card sticky top-24">
                <h2 className="heading-3 mb-8">Order Summary</h2>

                {/* Multi-vendor info */}
                {getVendorCount() > 1 && (
                  <div className="mb-6 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-primary-300 mb-1">Multi-Vendor Order</p>
                        <p className="text-xs text-text-secondary leading-relaxed">
                          Your order contains items from {getVendorCount()} vendors. Separate orders will be created for each vendor.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-text-secondary">
                    <span>Subtotal</span>
                    <span className="font-semibold">{formatPKR(getCartTotal())}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Shipping</span>
                    <span className="font-semibold text-text-tertiary">Calculated at checkout</span>
                  </div>
                  <div className="border-t border-surface-light pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-text-primary">Grand Total</span>
                      <span className="font-display text-3xl font-bold text-primary-500">
                        {formatPKR(getCartTotal())}
                      </span>
                    </div>
                  </div>
                </div>

                <Link to="/checkout" className="w-full btn-primary mb-3 block text-center">
                  Proceed to Checkout
                </Link>
                <Link to="/products" className="block w-full text-center btn-outline">
                  Continue Shopping
                </Link>

                {/* Trust Badges */}
                <div className="mt-8 pt-8 border-t border-surface-light space-y-4">
                  <div className="flex items-center space-x-3 text-sm text-text-secondary">
                    <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Secure Checkout</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-text-secondary">
                    <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">Free Returns</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-text-secondary">
                    <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Fast Shipping</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
