const mongoose = require('mongoose');
const crypto = require('crypto');

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceInfo: {
    userAgent: String,
    ip: String,
    deviceType: String,
    browser: String,
    os: String
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  },
  isRevoked: {
    type: Boolean,
    default: false,
    index: true
  },
  revokedAt: {
    type: Date,
    default: null
  },
  lastUsedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
refreshTokenSchema.index({ userId: 1, isRevoked: 1 });
refreshTokenSchema.index({ token: 1, isRevoked: 1 });

// Static method to generate a new refresh token
refreshTokenSchema.statics.generateToken = function(userId, deviceInfo) {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  return this.create({
    token,
    userId,
    deviceInfo,
    expiresAt
  });
};

// Static method to find valid token
refreshTokenSchema.statics.findValidToken = function(token) {
  return this.findOne({
    token,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  }).populate('userId', 'username email userType isActive');
};

// Instance method to revoke token
refreshTokenSchema.methods.revoke = function() {
  this.isRevoked = true;
  this.revokedAt = new Date();
  return this.save();
};

// Instance method to update last used
refreshTokenSchema.methods.updateLastUsed = function() {
  this.lastUsedAt = new Date();
  return this.save();
};

// Static method to revoke all user tokens
refreshTokenSchema.statics.revokeAllUserTokens = function(userId) {
  return this.updateMany(
    { userId, isRevoked: false },
    { 
      isRevoked: true, 
      revokedAt: new Date() 
    }
  );
};

// Static method to revoke all user tokens except current
refreshTokenSchema.statics.revokeAllUserTokensExcept = function(userId, currentToken) {
  return this.updateMany(
    { 
      userId, 
      isRevoked: false,
      token: { $ne: currentToken }
    },
    { 
      isRevoked: true, 
      revokedAt: new Date() 
    }
  );
};

// Static method to clean up expired tokens
refreshTokenSchema.statics.cleanupExpiredTokens = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isRevoked: true, revokedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Delete revoked tokens older than 7 days
    ]
  });
};

// Pre-save middleware to hash token
refreshTokenSchema.pre('save', function(next) {
  if (this.isModified('token') && !this.isNew) {
    return next(new Error('Token cannot be modified'));
  }
  next();
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);


