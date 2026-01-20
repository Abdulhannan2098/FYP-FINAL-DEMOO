const { body } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

// Password validation regex: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .customSanitizer((value) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }))
    .isLength({ max: 50 })
    .withMessage('Name cannot exceed 50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .matches(passwordRegex)
    .withMessage(
      'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  body('role')
    .optional()
    .isIn(['customer', 'vendor'])
    .withMessage('Role must be either customer or vendor'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^(\+923|03)\d{9}$/)
    .withMessage('Phone must be in format 03001234567 or +923001234567 (no spaces or dashes)'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const productValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .customSanitizer((value) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }))
    .isLength({ max: 100 })
    .withMessage('Product name cannot exceed 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .customSanitizer((value) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }))
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ gt: 0, max: 100000000 })
    .withMessage('Invalid price. Price must be a number greater than 0')
    .toFloat(),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn([
      'Rims & Wheels',
      'Spoilers',
      'Body Kits',
      'Hoods',
      'LED Lights',
      'Body Wraps / Skins',
      'Exhaust Systems',
      'Interior Accessories',
    ])
    .withMessage('Invalid category'),
  body('stock')
    .notEmpty()
    .withMessage('Stock is required')
    .isInt({ min: 1, max: 100000 })
    .withMessage('Invalid stock. Stock must be a whole number of at least 1')
    .toInt(),
];

const productUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product name cannot be empty')
    .customSanitizer((value) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }))
    .isLength({ max: 100 })
    .withMessage('Product name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty')
    .customSanitizer((value) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }))
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('price')
    .optional()
    .isFloat({ gt: 0, max: 100000000 })
    .withMessage('Invalid price. Price must be a number greater than 0')
    .toFloat(),
  body('category')
    .optional()
    .isIn([
      'Rims & Wheels',
      'Spoilers',
      'Body Kits',
      'Hoods',
      'LED Lights',
      'Body Wraps / Skins',
      'Exhaust Systems',
      'Interior Accessories',
    ])
    .withMessage('Invalid category'),
  body('stock')
    .optional()
    .isInt({ min: 1, max: 100000 })
    .withMessage('Invalid stock. Stock must be a whole number of at least 1')
    .toInt(),
];

const orderValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.product')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100')
    .toInt(),
  body('shippingAddress.street')
    .trim()
    .notEmpty()
    .withMessage('Street address is required')
    .customSanitizer((value) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }))
    .isLength({ max: 200 })
    .withMessage('Street address is too long'),
  body('shippingAddress.city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .customSanitizer((value) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }))
    .isLength({ max: 100 })
    .withMessage('City is too long'),
  body('shippingAddress.state')
    .trim()
    .notEmpty()
    .withMessage('State is required')
    .customSanitizer((value) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }))
    .isLength({ max: 100 })
    .withMessage('State is too long'),
  body('shippingAddress.zipCode')
    .trim()
    .notEmpty()
    .withMessage('Zip code is required')
    .customSanitizer((value) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }))
    .isLength({ max: 20 })
    .withMessage('Zip code is too long'),
  body('shippingAddress.country')
    .trim()
    .notEmpty()
    .withMessage('Country is required')
    .customSanitizer((value) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }))
    .isLength({ max: 80 })
    .withMessage('Country is too long'),
];

const reviewValidation = [
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Comment is required')
    .customSanitizer((value) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }))
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters'),
];

module.exports = {
  registerValidation,
  loginValidation,
  productValidation,
  productUpdateValidation,
  orderValidation,
  reviewValidation,
};