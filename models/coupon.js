const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CouponSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true, // Ensure every coupon is associated with a user
  },
  title: {
    type: String,
    required: false, // Coupon title/name for display
  },
  imageUrl: {
    type: String,
    required: false, // URL of the image associated with the coupon (from product or store)
  },
  code: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false, // Coupon description/details from WooCommerce
  },
  instructions: {
    type: String,
    required: false, // How to use instructions for the coupon
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'], // Percentage or fixed amount discount
    required: true,
  },
  discountValue: {
    type: Number,
    required: true, // Discount value (percentage or fixed amount)
  },
  minPurchaseAmount: {
    type: Number,
    default: 0, // Minimum purchase amount to apply coupon (optional)
  },
  maxPurchaseAmount: {
    type: Number,
    required: false, // Maximum order amount allowed when using the coupon
  },
  startDate: {
    type: Date,
    required: true, // The date the coupon becomes valid
  },
  endDate: {
    type: Date,
    required: true, // The date the coupon expires
  },
  usageLimit: {
    type: Number,
    default: 1, // Maximum number of times this coupon can be used in total
  },
  usageLimitPerUser: {
    type: Number,
    required: false, // Maximum number of times per customer
  },
  usedCount: {
    type: Number,
    default: 0, // Track how many times this coupon has been used
  },
  isActive: {
    type: Boolean,
    default: true, // Whether the coupon is active or not
  },
  // Product-specific coupon information
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product', // Reference to our Product model (if product exists in our DB)
    required: false,
  },
  productIds: {
    type: [Number],
    required: false, // Array of WooCommerce product IDs this coupon applies to
  },
  productUrl: {
    type: String,
    required: false, // Product permalink where coupon can be applied
  },
  productName: {
    type: String,
    required: false, // Product name for display (e.g., "Apply on [Product Name]")
  },
  // Coupon restrictions and flags
  individualUse: {
    type: Boolean,
    default: false, // If true, coupon can only be used alone
  },
  freeShipping: {
    type: Boolean,
    default: false, // If true, enables free shipping
  },
  excludeSaleItems: {
    type: Boolean,
    default: false, // If true, cannot be used on sale items
  },
  emailRestrictions: {
    type: [String],
    required: false, // List of email addresses that can use this coupon
  },
  // WooCommerce category information
  productCategoryIds: {
    type: [Number],
    required: false, // Array of WooCommerce category IDs this coupon applies to
  },
  excludedProductCategoryIds: {
    type: [Number],
    required: false, // Array of WooCommerce category IDs excluded
  },
  affiliateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Affiliate', // Reference to an affiliate
    required: false,
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store', // Reference to a store
    required: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // Reference to a category (our app's category)
    required: true,
  },
  // Entity scope (optional) - describes what this coupon specifically applies to
  entityScope: {
    type: String,
    enum: ['global', 'entity'],
    default: 'global',
  },
  entityType: {
    type: String,
    required: false, // Dynamic key matching storeIndicators[].key
    trim: true,
  },
  entityName: {
    type: String,
    required: false,
    trim: true,
  },
  entityLocation: {
    type: String,
    required: false,
    trim: true,
  },
  entityTags: {
    type: [String],
    required: false,
    default: [],
  },
  // WooCommerce external ID for tracking
  wooCommerceId: {
    type: Number,
    required: false, // Store WooCommerce coupon ID for reference
  },

  // Location targeting - countries where coupon is available
  availableCountries: {
    type: [String], // Array of country names or 'WORLDWIDE'
    default: ['WORLDWIDE'], // Default to worldwide availability
  },
  isWorldwide: {
    type: Boolean,
    default: true, // If true, available to all countries
  },

  // Price fields (for savings calculation and display)
  originalPrice: {
    type: Number,
    required: false,
  },
  discountedPrice: {
    type: Number,
    required: false,
  },
  currency: {
    type: String,
    default: 'USD',
    required: false,
    trim: true,
  },
  savingsAmount: {
    type: Number,
    required: false, // Calculated: originalPrice - discountedPrice
  },
  savingsPercentage: {
    type: Number,
    required: false, // Calculated: (savingsAmount / originalPrice) * 100
  },

  // Image gallery support (for detail pages)
  imageGallery: [{
    url: {
      type: String,
      required: true,
    },
    alt: {
      type: String,
      required: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  }],

  // Rich content fields for detail pages
  longDescription: {
    type: String,
    required: false, // Extended description for detail page
  },
  highlights: [{
    type: String,
    trim: true,
  }], // Array of bullet points
  termsAndConditions: {
    type: String,
    required: false, // Full T&C text
  },

  // SEO fields
  seoTitle: {
    type: String,
    required: false,
    trim: true,
  },
  seoDescription: {
    type: String,
    required: false,
    trim: true,
  },
  seoKeywords: [{
    type: String,
    trim: true,
  }],
  canonicalUrl: {
    type: String,
    required: false,
    trim: true,
  },
  ogImage: {
    type: String,
    required: false,
    trim: true,
  },

  // Related items
  relatedCouponIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
  }],
  relatedDealIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
  }],
  tags: [{
    type: String,
    trim: true,
  }],

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Automatically update the updatedAt field on save and calculate savings
CouponSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  
  // Calculate savings if price fields are provided
  if (this.originalPrice && this.discountedPrice && 
      typeof this.originalPrice === 'number' && typeof this.discountedPrice === 'number' &&
      this.originalPrice > 0 && this.discountedPrice > 0) {
    this.savingsAmount = this.originalPrice - this.discountedPrice;
    this.savingsPercentage = parseFloat(((this.savingsAmount / this.originalPrice) * 100).toFixed(2));
  }
  
  next();
});

// Method to check if the coupon is valid (active and within date range)
CouponSchema.methods.isValid = function () {
  const currentDate = new Date();
  return (
    this.isActive &&
    currentDate >= this.startDate &&
    currentDate <= this.endDate &&
    this.usedCount < this.usageLimit
  );
};

// Method to increment the usage count when a coupon is applied
CouponSchema.methods.incrementUsage = function () {
  this.usedCount += 1;
  return this.save();
};

const Coupon = mongoose.model('Coupon', CouponSchema);

// Ensure compound uniqueness for (code, storeId)
Coupon.collection.createIndex({ code: 1, storeId: 1 }, { unique: true }).catch(()=>{});

module.exports = Coupon;
