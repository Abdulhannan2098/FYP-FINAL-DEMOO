import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('autosphere_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to load cart from localStorage', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('autosphere_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, quantity = 1) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.product._id === product._id);

      if (existingItem) {
        // Update quantity if item already exists
        return prevItems.map((item) =>
          item.product._id === product._id
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
            : item
        );
      } else {
        // Add new item to cart
        return [...prevItems, { product, quantity: Math.min(quantity, product.stock) }];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.product._id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.product._id === productId
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.product.stock)) }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  // Multi-vendor cart support: Group cart items by vendor
  const getCartByVendor = () => {
    const grouped = {};

    cartItems.forEach((item) => {
      const vendorId = item.product.vendor?._id || item.product.vendor;
      const vendorName = item.product.vendor?.name || 'Unknown Vendor';

      if (!grouped[vendorId]) {
        grouped[vendorId] = {
          vendorId,
          vendorName,
          items: [],
          subtotal: 0,
        };
      }

      grouped[vendorId].items.push(item);
      grouped[vendorId].subtotal += item.product.price * item.quantity;
    });

    return Object.values(grouped);
  };

  // Get grand total across all vendors
  const getGrandTotal = () => {
    return getCartTotal();
  };

  // Get total number of vendors in cart
  const getVendorCount = () => {
    const vendorIds = new Set();
    cartItems.forEach((item) => {
      const vendorId = item.product.vendor?._id || item.product.vendor;
      vendorIds.add(vendorId);
    });
    return vendorIds.size;
  };

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    getCartByVendor,
    getGrandTotal,
    getVendorCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
