const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Strip trailing slashes from URL env vars to avoid double-slash redirects
const stripSlash = (url) => (url || '').replace(/\/+$/, '');

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  MONGODB_URI:
    String(process.env.USE_LOCAL_DB || '').toLowerCase() === 'true'
      ? process.env.MONGODB_URI_LOCAL || 'mongodb://127.0.0.1:27017/AutoSphere_db'
      : process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  CORS_ORIGIN: stripSlash(process.env.CORS_ORIGIN) || 'http://localhost:5173',
  FRONTEND_URL: stripSlash(process.env.FRONTEND_URL) || 'http://localhost:5173',

  // OAuth Configuration
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',

  // Cloudinary — cloud image storage
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};