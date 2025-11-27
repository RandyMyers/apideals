/**
 * Search Console Settings Model
 * Stores Google Search Console OAuth credentials and configuration
 */

const mongoose = require('mongoose');

const searchConsoleSettingsSchema = new mongoose.Schema({
  // OAuth 2.0 Credentials
  clientId: {
    type: String,
    required: false,
  },
  clientSecret: {
    type: String,
    required: false,
  },
  redirectUri: {
    type: String,
    default: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/v1/search-console/oauth/callback`,
  },
  
  // Token storage (encrypted in production)
  accessToken: {
    type: String,
    required: false,
  },
  refreshToken: {
    type: String,
    required: false,
  },
  tokenExpiry: {
    type: Date,
    required: false,
  },
  
  // Site verification
  verifiedSites: [{
    siteUrl: {
      type: String,
      required: true,
    },
    verificationMethod: {
      type: String,
      enum: ['html', 'meta', 'dns', 'file'],
    },
    verifiedAt: {
      type: Date,
    },
  }],
  
  // Auto-submit settings
  autoSubmitSitemap: {
    type: Boolean,
    default: true,
  },
  sitemapUrls: [{
    type: String,
  }],
  
  // Sync settings
  syncEnabled: {
    type: Boolean,
    default: true,
  },
  lastSyncAt: {
    type: Date,
  },
  syncFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily',
  },
  
  // Settings metadata
  isActive: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for faster lookups
searchConsoleSettingsSchema.index({ isActive: 1 });

// Static method to get active settings
searchConsoleSettingsSchema.statics.getActiveSettings = async function() {
  return await this.findOne({ isActive: true });
};

// Static method to get or create settings
searchConsoleSettingsSchema.statics.getOrCreateSettings = async function() {
  let settings = await this.getActiveSettings();
  if (!settings) {
    settings = await this.create({ isActive: true });
  }
  return settings;
};

// Method to check if token is expired
searchConsoleSettingsSchema.methods.isTokenExpired = function() {
  if (!this.tokenExpiry) return true;
  return new Date() >= this.tokenExpiry;
};

// Method to check if OAuth is configured
searchConsoleSettingsSchema.methods.isOAuthConfigured = function() {
  return !!(this.clientId && this.clientSecret);
};

// Method to check if authenticated
searchConsoleSettingsSchema.methods.isAuthenticated = function() {
  return !!(this.accessToken && this.refreshToken && !this.isTokenExpired());
};

module.exports = mongoose.model('SearchConsoleSettings', searchConsoleSettingsSchema);

