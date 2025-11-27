const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Store Schema
const StoreSchema = new Schema({
  // Name of the store
  name: {
    type: String,
    required: true,
    unique: true, // Ensure no two stores have the same name
    trim: true,
  },

  // Store owner (reference to the User model)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assumes there's a User model that stores information about the owner
    required: true,
  },

  // A short description of the store
  description: {
    type: String,
    trim: true,
  },

  // Store logo image (URL or path to image file)
  logo: {
    type: String,
  },
  affiliates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Affiliate', // Reference to Coupon model
  }],
  // Referral coupons associated with the store (reference to Coupon model)
  coupons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon', // Reference to Coupon model
  }],

  // Deals associated with the store (reference to Deal model)
  deals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal', // Reference to Deal model
  }],

  // Subscription details (to track user subscription plan)
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan', // Reference to SubscriptionPlan model
    
  },
  averageRating: {
    type: Number,
    default: 0, // Initialize with 0
    min: 0,
    max: 5,
  },
  ratingCount: {
    type: Number,
    default: 0, // Number of ratings
  },

  // WooCommerce integration details
  url: {
    type: String,
    required: true, // WooCommerce store URL
  },

  apiKey: {
    type: String,
    required: false, // API key for WooCommerce integration
  },

  secretKey: {
    type: String,
    required: false, // Secret key for WooCommerce integration
  },

  // Woo sync settings
  syncDirection: {
    type: String,
    enum: ['pull', 'push', 'bidirectional'],
    default: 'pull'
  },

  webhookSecret: {
    type: String,
    required: false
  },

  // Default category for synced coupons/deals from this store
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false
  },

  // Store type: 'woocommerce', 'shopify', 'none', etc.
  storeType: {
    type: String,
    enum: ['woocommerce', 'shopify', 'none'],
    default: 'none'
  },

  // The date of the last successful sync with WooCommerce
  lastSyncDate: {
    type: Date,
    default: null, // Null if no sync has occurred yet
  },

  // Store active status (whether the store is open or closed)
  isActive: {
    type: Boolean,
    default: true,
  },

  // Sponsored store fields
  isSponsored: {
    type: Boolean,
    default: false, // Stores are not sponsored by default
  },
  sponsoredPriority: {
    type: Number,
    default: 0, // Higher number = higher priority in sponsored list
  },
  sponsoredStartDate: {
    type: Date, // When sponsored status started
  },
  sponsoredEndDate: {
    type: Date, // When sponsored status ends (for campaigns)
  },
  sponsoredByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // User who paid for/sponsored this (can be admin or store owner)
  },
  sponsoredPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment', // Payment that enabled sponsorship
  },
  
  // View count (denormalized for performance)
  viewCount: {
    type: Number,
    default: 0, // Total views tracked via View model
  },

  // Location targeting - countries where store is available
  availableCountries: {
    type: [String], // Array of country names or 'WORLDWIDE'
    default: ['WORLDWIDE'], // Default to worldwide availability
  },
  isWorldwide: {
    type: Boolean,
    default: true, // If true, available to all countries
  },
  
  // Users who follow this store (for notifications)
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  followerCount: {
    type: Number,
    default: 0, // Denormalized count for performance
  },
  
  // Store-specific saving tips
  savingTips: [{
    tip: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true
    },
    order: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Store created and updated timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create Store Model
const Store = mongoose.model('Store', StoreSchema);
module.exports = Store;
