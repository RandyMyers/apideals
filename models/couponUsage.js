const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * CouponUsage Model
 * Tracks when users mark coupons or deals as "used" and "worked"
 * Used to calculate total savings, monthly savings, and usage statistics
 */
const CouponUsageSchema = new Schema({
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
  // Discount information at time of use
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
  },
  // Purchase information (optional - user can provide)
  purchaseAmount: {
    type: Number,
    default: 0, // If not provided, we'll estimate based on discount
  },
  // Calculated savings amount
  savingsAmount: {
    type: Number,
    required: true,
    default: 0,
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

// Pre-save hook to calculate savings amount
CouponUsageSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('discountValue') || this.isModified('purchaseAmount')) {
    if (this.discountType === 'percentage') {
      // For percentage: savings = purchaseAmount * (discountValue / 100)
      // If purchaseAmount not provided, estimate based on minimum purchase or default
      const baseAmount = this.purchaseAmount > 0 
        ? this.purchaseAmount 
        : (this.discountValue >= 10 ? 50 : 20); // Estimate: higher discount = higher purchase
      this.savingsAmount = (baseAmount * this.discountValue) / 100;
    } else {
      // For fixed amount: savings = discountValue (up to purchaseAmount)
      this.savingsAmount = this.purchaseAmount > 0
        ? Math.min(this.discountValue, this.purchaseAmount)
        : this.discountValue;
    }
  }
  next();
});

// Static method to get user's total savings
CouponUsageSchema.statics.getTotalSavings = async function(userId) {
  const result = await this.aggregate([
    { $match: { userId: userId, worked: true } },
    { $group: { _id: null, total: { $sum: '$savingsAmount' } } }
  ]);
  return result.length > 0 ? result[0].total : 0;
};

// Static method to get monthly savings
CouponUsageSchema.statics.getMonthlySavings = async function(userId, year, month) {
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
    { $group: { _id: null, total: { $sum: '$savingsAmount' } } }
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
        totalSavings: { $sum: '$savingsAmount' }
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

