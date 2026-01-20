const { validationResult } = require('express-validator');

// Centralized express-validator error handler.
// Ensures every route that attaches validators actually rejects invalid input.
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  // Keep response user-friendly and consistent.
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    })),
  });
};

module.exports = validateRequest;
