const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const { Server } = require('socket.io');
const passport = require('../config/passport');
const connectDB = require('../config/db');
const errorHandler = require('../middlewares/errorHandler');
const { generalLimiter } = require('../middlewares/rateLimiter');
const env = require('../config/env');
const { verifyConnection: verifyEmailConnection } = require('../utils/emailService');

// Import routes
const authRoutes = require('../routes/auth');
const sessionRoutes = require('../routes/sessions');
const productRoutes = require('../routes/products');
const orderRoutes = require('../routes/orders');
const reviewRoutes = require('../routes/reviews');
const wishlistRoutes = require('../routes/wishlist');
const chatRoutes = require('../routes/chat');
const vendorRoutes = require('../routes/vendor');
const vendorsRoutes = require('../routes/vendors');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Hide framework signature
app.disable('x-powered-by');

// Initialize Socket.io with flexible CORS for development
const socketCorsOptions = env.NODE_ENV === 'production'
  ? { origin: env.CORS_ORIGIN, methods: ['GET', 'POST'], credentials: true }
  : { origin: true, methods: ['GET', 'POST'], credentials: true }; // Allow all origins in dev

const io = new Server(server, {
  cors: socketCorsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB for file uploads
  transports: ['websocket', 'polling']
});

// Make io accessible to routes
app.set('io', io);

// Connect to MongoDB
connectDB();

// Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Allow WebSocket connections
  // Uploaded assets are consumed by a different origin in development (Vite).
  // Helmet defaults CORP to "same-origin" which Chrome blocks for <img> loads.
  crossOriginResourcePolicy: false
})); // Security headers

// CORS configuration for development (allows local network access for mobile testing)
const corsOptions = env.NODE_ENV === 'production'
  ? { origin: env.CORS_ORIGIN, credentials: true }
  : {
      // In development, allow all origins for easier mobile/Expo testing
      origin: true,
      credentials: true
    };

app.use(cors(corsOptions)); // CORS
app.use(morgan('dev')); // Logging
app.use(express.json({ limit: '10mb' })); // Body parser with limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security: mitigate NoSQL injection and HTTP parameter pollution
app.use(mongoSanitize());
app.use(hpp());

app.use(passport.initialize()); // Initialize passport

// Apply rate limiting to all API routes (disabled in development for easier testing)
if (env.NODE_ENV === 'production') {
  app.use('/api', generalLimiter);
}

// Serve uploaded files statically.
// Important: allow cross-origin resource loading in the browser (CORP) for images.
const uploadsCorsOptions = env.NODE_ENV === 'production'
  ? { origin: env.CORS_ORIGIN, credentials: false }
  : { origin: true, credentials: false };

app.use(
  '/uploads',
  cors(uploadsCorsOptions),
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static('uploads')
);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/vendors', vendorsRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AutoSphere API is running',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      socketio: 'active'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize Socket.io handlers
require('../socket/chatHandler')(io);

// Start server
// const PORT = env.PORT || 5000;
// server.listen(PORT, '0.0.0.0', async () => {
//   console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
//   console.log(`📡 Socket.io server ready on port ${PORT}`);
//   console.log(`📱 Network accessible - Use your local IP to access from mobile`);
//
//   // Verify email service connection on startup
//   const emailStatus = await verifyEmailConnection();
//   if (emailStatus.success) {
//     console.log(`📧 Email service: ${emailStatus.mode === 'smtp' ? 'SMTP connected' : 'Console mode (no delivery)'}`);
//   } else {
//     console.error(`⚠️  Email service: Connection failed - ${emailStatus.error}`);
//   }
// });
export default app;