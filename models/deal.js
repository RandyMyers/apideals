const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DealSchema = new Schema({
  title: {
    type: String,
    required: false, // Deal title for display
  },
  name: {
    type: String,
    required: true, // Name of the deal (e.g., "Black Friday Sale")
  },
  description: {
    type: String,
    required: false, // A description of the deal (optional for deals)
  },
  instructions: {
    type: String,
    required: false, // How to use instructions for the deal
  },
  imageUrl: {
    type: String,
    required: false, // Product image URL from WooCommerce
  },
  productUrl: {
    type: String,
    required: false, // Product permalink where deal can be accessed
  },
  productId: {
    type: Number,
    required: false, // WooCommerce product ID
  },
  dealType: {
    type: String,
    enum: ['discount', 'bundle', 'free_shipping'], // Type of the deal (e.g., discount, bundle, free shipping)
    required: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'], // Type of discount (percentage or fixed amount)
    required: function () {
      return this.dealType === 'discount'; // Only required if dealType is 'discount'
    },
  },
  discountValue: {
    type: Number,
    required: function () {
      return this.dealType === 'discount'; // Only required if dealType is 'discount'
    },
  },
  bundleItems: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product', // Reference to the Product model if deal type is 'bundle'
        required: function () {
          return this.dealType === 'bundle'; // Only required if dealType is 'bundle'
        },
      },
      quantity: {
        type: Number,
        required: function () {
          return this.dealType === 'bundle'; // Only required if dealType is 'bundle'
        },
      },
    },
  ],
  freeShipping: {
    type: Boolean,
    default: false, // If the deal offers free shipping
    required: function () {
      return this.dealType === 'free_shipping'; // Only required if dealType is 'free_shipping'
    },
  },

  // Pricing information (optional) for analytics and savings calculations
  originalPrice: {
    type: Number,
    required: false, // Reference/list price before discount
  },
  discountedPrice: {
    type: Number,
    required: false, // Actual deal price (e.g., 386 in the Expedia example)
  },
  currency: {
    type: String,
    required: false, // e.g., 'USD'
    trim: true,
  },
  priceUnit: {
    type: String,
    required: false, // e.g., 'per_night', 'per_stay'
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

  // Variable product support
  isVariableProduct: {
    type: Boolean,
    default: false, // True if this deal applies to a variable product
  },
  variations: [{
    variationId: {
      type: Number,
      required: true, // WooCommerce variation ID
    },
    sku: {
      type: String,
      required: false,
    },
    attributes: {
      type: Map,
      of: String, // e.g., { "Size": "M", "Color": "Red" }
    },
    regularPrice: {
      type: Number,
      required: false,
    },
    salePrice: {
      type: Number,
      required: false,
    },
    onSale: {
      type: Boolean,
      default: false,
    },
    image: {
      url: {
        type: String,
        required: false,
      },
      alt: {
        type: String,
        required: false,
      },
    },
    stockStatus: {
      type: String,
      enum: ['instock', 'outofstock', 'onbackorder'],
      default: 'instock',
    },
    stockQuantity: {
      type: Number,
      required: false,
    },
    purchasable: {
      type: Boolean,
      default: true,
    },
  }],
  defaultVariationId: {
    type: Number,
    required: false, // Variation ID to show by default (first on-sale, or first in stock)
  },
  applicableVariationIds: {
    type: [Number],
    required: false, // Array of variation IDs that are on sale (if only some variations are on sale)
  },
  allVariationsOnSale: {
    type: Boolean,
    default: true, // True if all variations are on sale, false if only some are
  },
  priceRange: {
    min: {
      type: Number,
      required: false, // Minimum price across all variations
    },
    max: {
      type: Number,
      required: false, // Maximum price across all variations
    },
  },
  startDate: {
    type: Date,
    required: true, // The date the deal becomes valid
  },
  endDate: {
    type: Date,
    required: true, // The date the deal expires
  },
  maxUsage: {
    type: Number,
    default: 1, // Maximum number of times the deal can be applied
  },
  usedCount: {
    type: Number,
    default: 0, // Number of times the deal has been used
  },
  views: {
    type: Number,
    default: 0, // Track how many times this deal has been viewed
  },
  isActive: {
    type: Boolean,
    default: true, // Whether the deal is active or not
  },
  isPublished: {
    type: Boolean,
    default: false, // Whether the deal is published and visible to public
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the Affiliate model
    required: false, // Optional, as not all deals need to be linked to an affiliate
  },
  affiliate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Affiliate', // Reference to the Affiliate model
    required: false, // Optional, as not all deals need to be linked to an affiliate
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store', // Reference to the Store model
    required: true, // Each deal must be associated with a store
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // Reference to the Category model
    required: true, // Each deal must belong to a category
  },

  // Entity scope (optional) - describes what this deal specifically applies to
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

  // Location targeting - countries where deal is available
  availableCountries: {
    type: [String], // Array of country names or 'WORLDWIDE'
    default: ['WORLDWIDE'], // Default to worldwide availability
  },
  isWorldwide: {
    type: Boolean,
    default: true, // If true, available to all countries
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
  }], // Array of bullet points (e.g., "Free shipping", "24/7 support")
  features: [{
    type: String,
    trim: true,
  }], // Product/deal features
  specifications: {
    type: Map,
    of: String, // Flexible key-value pairs for different store types
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

  // Additional metadata
  tags: [{
    type: String,
    trim: true,
  }], // For categorization and search
  relatedDealIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
  }],
  relatedCouponIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
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
DealSchema.pre('save', function (next) {
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

// Method to check if the deal is valid (active and within date range)
DealSchema.methods.isValid = function () {
  const currentDate = new Date();
  return (
    this.isActive &&
    currentDate >= this.startDate &&
    currentDate <= this.endDate &&
    this.usedCount < this.maxUsage
  );
};

// Method to increment the usage count when a deal is used
DealSchema.methods.incrementUsage = function () {
  this.usedCount += 1;
  return this.save();
};

const Deal = mongoose.model('Deal', DealSchema);

// Optional uniqueness per store
Deal.collection.createIndex({ name: 1, store: 1 }, { unique: true }).catch(()=>{});

module.exports = Deal;
