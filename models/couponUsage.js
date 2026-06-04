const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * CouponUsage Model
 * Tracks when users mark coupons or deals as "used" and "worked"
 * Used to calculate total savings, monthly savings, and usage statistics
 */
const CouponUsageSchema = new Schema({
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: false,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  entityType: {
    type: String,
    enum: ['coupon', 'deal'],
    required: true,
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'entityModel',
    index: true,
  },
  entityModel: {
    type: String,
    enum: ['Coupon', 'Deal'],
    required: true,
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true,
  },
  // Discount information at time of use.
  // Optional: deals like free shipping / bundles have no discountType/Value.
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: false,
  },
  discountValue: {
    type: Number,
    required: false,
  },
  // Purchase information (optional - user can provide via the savings modal)
  purchaseAmount: {
    type: Number,
    default: 0,
  },
  purchaseCurrency: {
    type: String,
    trim: true,
    uppercase: true,
  },
  /** ISO 4217 — currency of savingsAmount */
  currency: {
    type: String,
    trim: true,
    uppercase: true,
    default: 'USD',
  },
  // Calculated savings amount in transaction currency (only meaningful when savingsKnown is true)
  savingsAmount: {
    type: Number,
    required: false,
    default: 0,
  },
  /** Canonical USD amount for cross-offer totals */
  savingsAmountUsd: {
    type: Number,
    default: 0,
  },
  exchangeRate: {
    type: Number,
  },
  exchangeRateSnapshotAt: {
    type: Date,
  },
  exchangeRateSource: {
    type: String,
    enum: ['db-snapshot', 'identity', 'unknown', 'failed'],
    default: 'unknown',
  },
  // Whether savingsAmount is a verified/derived figure (vs. an unknown we don't count)
  savingsKnown: {
    type: Boolean,
    default: false,
  },
  // How savingsAmount was derived
  savingsSource: {
    type: String,
    enum: ['price', 'fixed', 'userInput', 'unknown'],
    default: 'unknown',
  },
  // User feedback
  worked: {
    type: Boolean,
    default: true, // User confirms it worked
  },
  // Usage metadata
  usedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  // Optional notes from user
  notes: {
    type: String,
    maxlength: 500,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
CouponUsageSchema.index({ userId: 1, usedAt: -1 });
CouponUsageSchema.index({ userId: 1, entityType: 1 });
CouponUsageSchema.index({ storeId: 1, usedAt: -1 });
CouponUsageSchema.index({ usedAt: -1 });

// Pre-save fallback for savings.
// Controllers should pre-compute savings via utils/savingsCalculator and set
// savingsKnown/savingsSource explicitly. This hook only fills in honest values
// for records created without that computation. It NEVER fabricates an estimate:
// a percentage offer with no purchaseAmount stays at 0 / unknown.
CouponUsageSchema.pre('save', function(next) {
  if (this.savingsKnown) {
    return next();
  }
  if (this.discountType === 'fixed' && this.discountValue > 0) {
    this.savingsAmount = this.purchaseAmount > 0
      ? Math.min(this.discountValue, this.purchaseAmount)
      : this.discountValue;
    this.savingsKnown = true;
    this.savingsSource = 'fixed';
  } else if (this.discountType === 'percentage' && this.discountValue > 0 && this.purchaseAmount > 0) {
    this.savingsAmount = Math.round((this.purchaseAmount * this.discountValue) / 100 * 100) / 100;
    this.savingsKnown = true;
    this.savingsSource = 'userInput';
  } else {
    // Unknown: do not invent a number.
    this.savingsAmount = 0;
    this.savingsKnown = false;
    this.savingsSource = 'unknown';
  }
  next();
});

const { SAVINGS_USD_SUM } = require('../utils/savingsConversion');

// Static method to get user's total savings (USD canonical)
CouponUsageSchema.statics.getTotalSavingsUsd = async function(userId) {
  const result = await this.aggregate([
    { $match: { userId: userId, worked: true } },
    { $group: { _id: null, total: SAVINGS_USD_SUM } }
  ]);
  return result.length > 0 ? result[0].total : 0;
};

// Static method to get monthly savings (USD canonical)
CouponUsageSchema.statics.getMonthlySavingsUsd = async function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const result = await this.aggregate([
    {
      $match: {
        userId: userId,
        worked: true,
        usedAt: { $gte: startDate, $lte: endDate }
      }
    },
    { $group: { _id: null, total: SAVINGS_USD_SUM } }
  ]);
  return result.length > 0 ? result[0].total : 0;
};

// Static method to get usage statistics
CouponUsageSchema.statics.getUsageStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: userId, worked: true } },
    {
      $group: {
        _id: '$entityType',
        count: { $sum: 1 },
        totalSavings: SAVINGS_USD_SUM
      }
    }
  ]);
  
  const couponStats = stats.find(s => s._id === 'coupon') || { count: 0, totalSavings: 0 };
  const dealStats = stats.find(s => s._id === 'deal') || { count: 0, totalSavings: 0 };
  
  return {
    couponsUsed: couponStats.count,
    dealsUsed: dealStats.count,
    totalUsed: couponStats.count + dealStats.count,
    couponSavings: couponStats.totalSavings,
    dealSavings: dealStats.totalSavings,
  };
};

module.exports = mongoose.model('CouponUsage', CouponUsageSchema);

