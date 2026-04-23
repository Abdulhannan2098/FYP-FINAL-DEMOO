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

  const getProductId = (item) => {
    if (!item) return null;
    if (typeof item.product === 'string') return item.product;
    return item.product?._id || null;
  };

  const hasRenderableProduct = (item) => {
    return Boolean(item?.product && typeof item.product === 'object' && item.product._id);
  };

  const extractWishlistProducts = (response) => {
    const data = response?.data?.data;
    const rawProducts = data?.wishlist?.products || data?.products || [];

    if (!Array.isArray(rawProducts)) return [];

    // Keep only entries with populated product documents to avoid broken card rendering.
    return rawProducts.filter(hasRenderableProduct);
  };

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
      setWishlist(extractWishlistProducts(response));
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
      const updatedWishlist = extractWishlistProducts(response);

      if (updatedWishlist.length > 0) {
        setWishlist(updatedWishlist);
      } else {
        await fetchWishlist();
      }

      showToast('Added to wishlist', 'success');
      return true;
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to add to wishlist', 'error');
      return false;
    }
  };

  const removeFromWishlist = async (productId) => {
    let removedItem = null;
    let removedIndex = -1;

    try {
      setWishlist((prevWishlist) => {
        removedIndex = prevWishlist.findIndex((item) => getProductId(item) === productId);

        if (removedIndex === -1) {
          return prevWishlist;
        }

        removedItem = prevWishlist[removedIndex];
        const updatedWishlist = prevWishlist.filter((_, index) => index !== removedIndex);
        console.log('Updated Wishlist:', updatedWishlist);
        return updatedWishlist;
      });

      await api.delete(`/wishlist/${productId}`);

      showToast('Removed from wishlist', 'success');
      return true;
    } catch (error) {
      if (removedItem) {
        setWishlist((prevWishlist) => {
          const alreadyRestored = prevWishlist.some((item) => getProductId(item) === productId);
          if (alreadyRestored) {
            return prevWishlist;
          }

          const restoredWishlist = [...prevWishlist];
          const insertAt = Math.min(Math.max(removedIndex, 0), restoredWishlist.length);
          restoredWishlist.splice(insertAt, 0, removedItem);
          return restoredWishlist;
        });
      }

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
    return wishlist.some((item) => getProductId(item) === productId);
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
