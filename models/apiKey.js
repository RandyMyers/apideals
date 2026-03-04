const mongoose = require('mongoose');
const crypto = require('crypto');

const Schema = mongoose.Schema;

const ApiKeySchema = new Schema({
  // SHA256 hash for fast lookup (never store raw key)
  keyHash: {
    type: String,
    required: true,
    unique: true,
  },

  // Prefix for display (e.g. "dc_live_") - helps identify key type
  keyPrefix: {
    type: String,
    required: true,
    default: 'dc_live_',
  },

  // User this key belongs to (inherits permissions)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Friendly name (e.g. "Store App - Fashion")
  name: {
    type: String,
    required: true,
    trim: true,
  },

  // Optional expiry (null = never expires)
  expiresAt: {
    type: Date,
    default: null,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  lastUsedAt: {
    type: Date,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Generate a new API key (static method - returns raw key)
// Use base64 + replace for Node 12+ compatibility (base64url added in Node 15.13)
ApiKeySchema.statics.generateKey = function (prefix = 'dc_live_') {
  const randomPart = crypto.randomBytes(24).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${prefix}${randomPart}`;
};

// Hash a raw key for storage (SHA256 - fast, deterministic for lookup)
ApiKeySchema.statics.hashKey = function (rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
};

// Find and validate API key - returns ApiKey doc if valid
ApiKeySchema.statics.findByRawKey = async function (rawKey) {
  if (!rawKey || typeof rawKey !== 'string' || rawKey.length < 20) {
    return null;
  }

  const keyHash = this.hashKey(rawKey);
  const keyDoc = await this.findOne({
    keyHash,
    isActive: true,
  })
    .populate('userId')
    .lean();

  if (!keyDoc) return null;

  if (keyDoc.expiresAt && new Date() > new Date(keyDoc.expiresAt)) {
    return null;
  }

  return keyDoc;
};

const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', ApiKeySchema);
module.exports = ApiKey;
