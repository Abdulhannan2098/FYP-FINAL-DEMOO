import React, { createContext, useState, useContext, useEffect } from 'react';
import { saveCart, getCart, clearCart } from '../utils/storage';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load cart from storage on app start
  useEffect(() => {
    loadCart();
  }, []);

  // Save cart to storage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      saveCart(cartItems);
    }
  }, [cartItems]);

  const loadCart = async () => {
    try {
      const storedCart = await getCart();
      setCartItems(storedCart);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (product, quantity = 1) => {
    const productId = product._id || product.id;
    const existingItem = cartItems.find(item => (item._id || item.id) === productId);

    if (existingItem) {
      setCartItems(cartItems.map(item =>
        (item._id || item.id) === productId
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCartItems([...cartItems, {
        ...product,
        quantity,
        _id: productId,
        name: product.name,
        price: product.price,
        images: product.images,
        stock: product.stock,
        vendor: product.vendor
      }]);
    }
  };

  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter(item => item._id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems(cartItems.map(item =>
      item._id === productId ? { ...item, quantity } : item
    ));
  };

  const clearCartItems = async () => {
    await clearCart();
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  // Multi-vendor cart support: Group cart items by vendor
  const getCartByVendor = () => {
    const grouped = {};

    cartItems.forEach((item) => {
      const vendorId = item.vendor?._id || item.vendor || 'unknown';
      const vendorName = item.vendor?.name || 'Unknown Vendor';

      if (!grouped[vendorId]) {
        grouped[vendorId] = {
          vendorId,
          vendorName,
          items: [],
          subtotal: 0,
        };
      }

      grouped[vendorId].items.push(item);
      grouped[vendorId].subtotal += item.price * item.quantity;
    });

    return Object.values(grouped);
  };

  // Get total number of vendors in cart
  const getVendorCount = () => {
    const vendorIds = new Set();
    cartItems.forEach((item) => {
      const vendorId = item.vendor?._id || item.vendor || 'unknown';
      vendorIds.add(vendorId);
    });
    return vendorIds.size;
  };

  const value = {
    cartItems,
    isLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart: clearCartItems,
    getCartTotal,
    getCartCount,
    getCartByVendor,
    getVendorCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
