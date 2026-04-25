const mongoose = require('mongoose');
const env = require('./env');

// On Vercel serverless, module-level variables persist within a warm container.
// Caching the connection promise avoids opening a new connection on every invocation
// and prevents the 10-second Mongoose buffer timeout on cold starts.
let connectionPromise = null;

const connectDB = async () => {
  // Already connected — reuse without doing anything.
  if (mongoose.connection.readyState === 1) return;

  // A connection attempt is already in flight — wait for it instead of
  // opening a second connection (which would waste Atlas connection slots).
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose
    .connect(env.MONGODB_URI, {
      bufferCommands: false,        // fail fast — don't silently queue queries
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    })
    .then((conn) => {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    })
    .catch((error) => {
      console.error(`MongoDB Connection Error: ${error.message}`);
      connectionPromise = null;  // reset so the next request retries
      throw error;
    });

  return connectionPromise;
};

module.exports = connectDB;
