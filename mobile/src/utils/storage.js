import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  TOKEN: '@autosphere_token',
  USER: '@autosphere_user',
  CART: '@autosphere_cart',
};

/**
 * Save JWT token to AsyncStorage
 * @param {string} token - JWT token
 */
export const saveToken = async (token) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } catch (error) {
    console.error('Error saving token:', error);
    throw error;
  }
};

/**
 * Get JWT token from AsyncStorage
 * @returns {Promise<string|null>} JWT token or null
 */
export const getToken = async () => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

/**
 * Clear JWT token from AsyncStorage
 */
export const clearToken = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
  } catch (error) {
    console.error('Error clearing token:', error);
  }
};

/**
 * Save user data to AsyncStorage
 * @param {Object} user - User object
 */
export const saveUser = async (user) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user:', error);
    throw error;
  }
};

/**
 * Get user data from AsyncStorage
 * @returns {Promise<Object|null>} User object or null
 */
export const getUser = async () => {
  try {
    const user = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    if (!user) return null;

    let parsed = JSON.parse(user);
    // Handle legacy double-stringified data
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    return parsed;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

/**
 * Clear user data from AsyncStorage
 */
export const clearUser = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  } catch (error) {
    console.error('Error clearing user:', error);
  }
};

/**
 * Save cart data to AsyncStorage (local cart management)
 * @param {Array} cart - Cart items array
 */
export const saveCart = async (cart) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  } catch (error) {
    console.error('Error saving cart:', error);
    throw error;
  }
};

/**
 * Get cart data from AsyncStorage
 * @returns {Promise<Array>} Cart items array
 */
export const getCart = async () => {
  try {
    const cart = await AsyncStorage.getItem(STORAGE_KEYS.CART);
    return cart ? JSON.parse(cart) : [];
  } catch (error) {
    console.error('Error getting cart:', error);
    return [];
  }
};

/**
 * Clear cart data from AsyncStorage
 */
export const clearCart = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.CART);
  } catch (error) {
    console.error('Error clearing cart:', error);
  }
};

/**
 * Clear all app data from AsyncStorage (logout)
 */
export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.CART,
    ]);
  } catch (error) {
    console.error('Error clearing all data:', error);
  }
};
