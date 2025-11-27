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
  isActive: {
    type: Boolean,
    default: true, // Whether the deal is active or not
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

  // Location targeting - countries where deal is available
  availableCountries: {
    type: [String], // Array of country names or 'WORLDWIDE'
    default: ['WORLDWIDE'], // Default to worldwide availability
  },
  isWorldwide: {
    type: Boolean,
    default: true, // If true, available to all countries
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Automatically update the updatedAt field on save
DealSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
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
