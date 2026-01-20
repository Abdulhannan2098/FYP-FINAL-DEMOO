import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../services/api';
import { formatPKR } from '../utils/currency';

const Checkout = () => {
  const { cartItems, getCartTotal, clearCart, getCartByVendor, getVendorCount } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const vendorGroups = getCartByVendor();

  const [shippingAddress, setShippingAddress] = useState({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: user?.address?.country || '',
  });

  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress((prev) => ({ ...prev, [name]: value }));
    // Clear specific field error when user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'street':
        if (!value.trim()) {
          error = 'Street address is required';
        } else if (value.length > 200) {
          error = 'Street address is too long';
        }
        break;
      case 'city':
        if (!value.trim()) {
          error = 'City is required';
        } else if (value.length > 100) {
          error = 'City name is too long';
        }
        break;
      case 'state':
        if (!value.trim()) {
          error = 'State/Province is required';
        } else if (value.length > 100) {
          error = 'State name is too long';
        }
        break;
      case 'zipCode':
        if (!value.trim()) {
          error = 'Zip code is required';
        } else if (value.length > 20) {
          error = 'Zip code is too long';
        }
        break;
      case 'country':
        if (!value.trim()) {
          error = 'Country is required';
        } else if (value.length > 80) {
          error = 'Country name is too long';
        }
        break;
      default:
        break;
    }
    
    return error;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validate all fields
    const newErrors = {};
    Object.keys(shippingAddress).forEach((key) => {
      const error = validateField(key, shippingAddress[key]);
      if (error) {
        newErrors[key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please fix the errors in the shipping address', 'error');
      return;
    }

    try {
      setLoading(true);

      // Prepare order items
      const items = cartItems.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
      }));

      // Create order (backend will handle multi-vendor splitting)
      const response = await api.post('/orders', {
        items,
        shippingAddress,
        paymentMethod,
      });

      const { vendorCount } = response.data.data;

      if (vendorCount > 1) {
        showToast(`Successfully created ${vendorCount} orders from ${vendorCount} vendors!`, 'success');
      } else {
        showToast('Order placed successfully!', 'success');
      }

      clearCart();
      navigate('/dashboard/customer');
    } catch (error) {
      // Map backend errors to specific fields if available
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const backendErrors = {};
        error.response.data.errors.forEach((err) => {
          const fieldMatch = err.path?.match(/shippingAddress\.(.+)/);
          if (fieldMatch) {
            backendErrors[fieldMatch[1]] = err.msg;
          }
        });
        if (Object.keys(backendErrors).length > 0) {
          setErrors(backendErrors);
          showToast('Please fix the errors in the form', 'error');
        } else {
          showToast(error.response?.data?.message || 'Failed to create order', 'error');
        }
      } else {
        showToast(error.response?.data?.message || 'Failed to create order', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  if (cartItems.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-secondary-900 py-12">
      <div className="container-custom">
        <div className="max-w-5xl mx-auto">
          <h1 className="heading-1 mb-8">Checkout</h1>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Address */}
              <div className="bg-surface border border-surface-light rounded-lg p-6">
                <h2 className="heading-2 mb-6">Shipping Address</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      name="street"
                      value={shippingAddress.street}
                      onChange={handleInputChange}
                      className={`input-field ${errors.street ? 'border-red-500 focus:border-red-500' : ''}`}
                      placeholder="House 25, Street 10"
                      required
                    />
                    {errors.street && (
                      <p className="mt-1 text-sm text-red-400">{errors.street}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={shippingAddress.city}
                        onChange={handleInputChange}
                        className={`input-field ${errors.city ? 'border-red-500 focus:border-red-500' : ''}`}
                        placeholder="Islamabad"
                        required
                      />
                      {errors.city && (
                        <p className="mt-1 text-sm text-red-400">{errors.city}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={shippingAddress.state}
                        onChange={handleInputChange}
                        className={`input-field ${errors.state ? 'border-red-500 focus:border-red-500' : ''}`}
                        placeholder="ICT"
                        required
                      />
                      {errors.state && (
                        <p className="mt-1 text-sm text-red-400">{errors.state}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Zip Code
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        value={shippingAddress.zipCode}
                        onChange={handleInputChange}
                        className={`input-field ${errors.zipCode ? 'border-red-500 focus:border-red-500' : ''}`}
                        placeholder="44000"
                        required
                      />
                      {errors.zipCode && (
                        <p className="mt-1 text-sm text-red-400">{errors.zipCode}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        name="country"
                        value={shippingAddress.country}
                        onChange={handleInputChange}
                        className={`input-field ${errors.country ? 'border-red-500 focus:border-red-500' : ''}`}
                        placeholder="Pakistan"
                        required
                      />
                      {errors.country && (
                        <p className="mt-1 text-sm text-red-400">{errors.country}</p>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              {/* Payment Method */}
              <div className="bg-surface border border-surface-light rounded-lg p-6">
                <h2 className="heading-2 mb-6">Payment Method</h2>
                <div className="space-y-3">
                  {['Credit Card', 'Debit Card', 'PayPal', 'Cash on Delivery'].map((method) => (
                    <label key={method} className="flex items-center space-x-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-4 h-4 text-primary-500 bg-surface border-surface-light focus:ring-primary-500"
                      />
                      <span className="text-text-primary group-hover:text-primary-500 transition-colors">{method}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-surface border border-surface-light rounded-lg p-6 sticky top-24">
                <h2 className="heading-2 mb-6">Order Summary</h2>

                {/* Multi-vendor info */}
                {getVendorCount() > 1 && (
                  <div className="mb-6 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-text-secondary">
                        {getVendorCount()} separate orders will be created
                      </p>
                    </div>
                  </div>
                )}

                {/* Vendor groups */}
                <div className="space-y-6 mb-6">
                  {vendorGroups.map((vendorGroup) => (
                    <div key={vendorGroup.vendorId}>
                      {getVendorCount() > 1 && (
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-surface-light">
                          <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          <span className="text-xs font-semibold text-primary-400">{vendorGroup.vendorName}</span>
                        </div>
                      )}
                      <div className="space-y-2">
                        {vendorGroup.items.map((item) => (
                          <div key={item.product._id} className="flex justify-between text-sm">
                            <span className="text-text-secondary">
                              {item.product.name} x {item.quantity}
                            </span>
                            <span className="font-display font-medium text-text-primary">
                              {formatPKR(item.product.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-surface-light pt-4 space-y-3">
                  <div className="flex justify-between text-text-secondary text-sm">
                    <span>Subtotal</span>
                    <span>{formatPKR(getCartTotal())}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary text-sm">
                    <span>Shipping</span>
                    <span className="text-green-400">Free</span>
                  </div>
                  <div className="flex justify-between text-text-secondary text-sm">
                    <span>Tax</span>
                    <span>{formatPKR(0)}</span>
                  </div>
                  <div className="border-t border-surface-light pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-text-primary">Grand Total</span>
                      <span className="text-2xl font-display font-bold text-primary-500">
                        {formatPKR(getCartTotal())}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full btn-primary mt-6"
                >
                  {loading ? 'Placing Order...' : 'Place Order'}
                </button>

                <p className="text-xs text-text-tertiary text-center mt-4">
                  By placing your order, you agree to our terms and conditions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
