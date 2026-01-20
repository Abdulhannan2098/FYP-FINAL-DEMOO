const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Device Information
    deviceInfo: {
      browser: String,
      os: String,
      device: String,
      deviceType: {
        type: String,
        enum: ['Desktop', 'Mobile', 'Tablet', 'Unknown'],
        default: 'Unknown',
      },
    },
    // Location Information
    location: {
      ip: String,
      country: String,
      city: String,
      timezone: String,
    },
    // Session Status
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    inactivityTimeout: {
      type: Number,
      default: 10, // 30 minutes default inactivity timeout (in minutes)
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index - MongoDB will automatically delete expired sessions
    },
    // Login Information
    loginAt: {
      type: Date,
      default: Date.now,
    },
    logoutAt: {
      type: Date,
    },
    // Security
    isTrusted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
sessionSchema.index({ user: 1, isActive: 1 });
sessionSchema.index({ expiresAt: 1 });

// Update last activity
sessionSchema.methods.updateActivity = function () {
  this.lastActivity = Date.now();
  return this.save();
};

// Revoke session
sessionSchema.methods.revoke = function () {
  this.isActive = false;
  this.logoutAt = Date.now();
  return this.save();
};

// Static method to cleanup expired sessions
sessionSchema.statics.cleanupExpired = async function () {
  return await this.deleteMany({
    expiresAt: { $lt: Date.now() },
  });
};

// Check if session is inactive (exceeded inactivity timeout)
sessionSchema.methods.isInactive = function () {
  const inactivityMs = this.inactivityTimeout * 60 * 1000; // Convert minutes to milliseconds
  const timeSinceActivity = Date.now() - new Date(this.lastActivity).getTime();
  return timeSinceActivity > inactivityMs;
};

// Static method to revoke inactive sessions
sessionSchema.statics.revokeInactiveSessions = async function () {
  const sessions = await this.find({ isActive: true });
  let revokedCount = 0;

  for (const session of sessions) {
    if (session.isInactive()) {
      await session.revoke();
      revokedCount++;
    }
  }

  return revokedCount;
};

// Static method to revoke all sessions for a user except current
sessionSchema.statics.revokeAllExcept = async function (userId, currentToken) {
  return await this.updateMany(
    {
      user: userId,
      token: { $ne: currentToken },
      isActive: true,
    },
    {
      $set: {
        isActive: false,
        logoutAt: Date.now(),
      },
    }
  );
};

module.exports = mongoose.model('Session', sessionSchema);
