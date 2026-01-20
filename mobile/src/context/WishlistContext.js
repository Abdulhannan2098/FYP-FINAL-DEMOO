import { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import apiClient from '../api/client';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch wishlist when user logs in (only after auth check is complete)
  useEffect(() => {
    // Wait for auth check to complete before fetching
    // This prevents 401 errors during app launch
    if (authLoading) return;

    if (isAuthenticated && user) {
      fetchWishlist();
    } else {
      setWishlist([]);
    }
  }, [user, isAuthenticated, authLoading]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/wishlist');
      setWishlist(response.data.data.wishlist.products || []);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (productId) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to add items to wishlist');
      return false;
    }

    try {
      const response = await apiClient.post(`/wishlist/${productId}`);
      setWishlist(response.data.data.products || []);
      Alert.alert('Success', 'Added to wishlist');
      return true;
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add to wishlist');
      return false;
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      const response = await apiClient.delete(`/wishlist/${productId}`);
      setWishlist(response.data.data.products || []);
      Alert.alert('Success', 'Removed from wishlist');
      return true;
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to remove from wishlist');
      return false;
    }
  };

  const clearWishlist = async () => {
    try {
      await apiClient.delete('/wishlist');
      setWishlist([]);
      Alert.alert('Success', 'Wishlist cleared');
      return true;
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to clear wishlist');
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
