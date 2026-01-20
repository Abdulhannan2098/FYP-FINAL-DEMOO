import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import api from '../services/api';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch wishlist when user logs in
  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else {
      setWishlist([]);
    }
  }, [user]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const response = await api.get('/wishlist');
      setWishlist(response.data.data.wishlist.products || []);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (productId) => {
    if (!user) {
      showToast('Please login to add items to wishlist', 'error');
      return false;
    }

    try {
      const response = await api.post(`/wishlist/${productId}`);
      setWishlist(response.data.data.products || []);
      showToast('Added to wishlist', 'success');
      return true;
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to add to wishlist', 'error');
      return false;
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      const response = await api.delete(`/wishlist/${productId}`);
      setWishlist(response.data.data.products || []);
      showToast('Removed from wishlist', 'success');
      return true;
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to remove from wishlist', 'error');
      return false;
    }
  };

  const clearWishlist = async () => {
    try {
      await api.delete('/wishlist');
      setWishlist([]);
      showToast('Wishlist cleared', 'success');
      return true;
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to clear wishlist', 'error');
      return false;
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some(item => item.product?._id === productId || item.product === productId);
  };

  const toggleWishlist = async (productId) => {
    if (isInWishlist(productId)) {
      return await removeFromWishlist(productId);
    } else {
      return await addToWishlist(productId);
    }
  };

  const value = {
    wishlist,
    loading,
    wishlistCount: wishlist.length,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    isInWishlist,
    toggleWishlist,
    fetchWishlist,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export default WishlistContext;
