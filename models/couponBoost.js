const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CouponBoostSchema = new Schema({
  // Coupon being boosted
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    required: true,
    index: true
  },
  
  // User who purchased the boost
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Boost type and target
  boostType: {
    type: String,
    enum: ['homepage', 'category', 'store', 'search'],
    required: true,
    index: true
  },
  
  // Target ID (category ID, store ID, etc.)
  targetId: {
    type: String,
    required: function() {
      return ['category', 'store'].includes(this.boostType);
    }
  },
  
  // Boost duration in days
  duration: {
    type: Number,
    required: true,
    min: 1,
    max: 365
  },
  
  // Boost period
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  
  // Pricing
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    required: true,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'NGN', 'CAD', 'AUD']
  },
  
  // Payment details
  paymentId: {
    type: String,
    required: true,
    index: true
  },
  
  paymentMethod: {
    type: String,
    required: true,
    enum: ['card', 'bank_transfer', 'mobile_money', 'wallet']
  },
  
  // Boost status
  status: {
    type: String,
    enum: ['pending', 'active', 'expired', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },
  
  // Boost settings
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  
  // Analytics
  impressions: {
    type: Number,
    default: 0
  },
  
  clicks: {
    type: Number,
    default: 0
  },
  
  conversions: {
    type: Number,
    default: 0
  },
  
  // Metadata
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
CouponBoostSchema.index({ userId: 1, status: 1 });
CouponBoostSchema.index({ boostType: 1, targetId: 1, status: 1 });
CouponBoostSchema.index({ status: 1, endDate: 1 });
CouponBoostSchema.index({ startDate: 1, endDate: 1, status: 1 });
CouponBoostSchema.index({ priority: -1, createdAt: -1 });

// Pre-save middleware
CouponBoostSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-expire if past end date
  if (this.status === 'active' && this.endDate < new Date()) {
    this.status = 'expired';
  }
  
  next();
});

// Instance methods
CouponBoostSchema.methods.activate = function() {
  this.status = 'active';
  this.startDate = new Date();
  this.endDate = new Date(Date.now() + this.duration * 24 * 60 * 60 * 1000);
  return this.save();
};

CouponBoostSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

CouponBoostSchema.methods.refund = function() {
  this.status = 'refunded';
  return this.save();
};

CouponBoostSchema.methods.incrementImpressions = function() {
  this.impressions += 1;
  return this.save();
};

CouponBoostSchema.methods.incrementClicks = function() {
  this.clicks += 1;
  return this.save();
};

CouponBoostSchema.methods.incrementConversions = function() {
  this.conversions += 1;
  return this.save();
};

// Static methods
CouponBoostSchema.statics.findActive = function(boostType = null, targetId = null) {
  const query = { 
    status: 'active',
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() }
  };
  
  if (boostType) {
    query.boostType = boostType;
  }
  
  if (targetId) {
    query.targetId = targetId;
  }
  
  return this.find(query)
    .populate('couponId')
    .populate('userId', 'username')
    .sort({ priority: -1, createdAt: -1 });
};

CouponBoostSchema.statics.findByUser = function(userId, limit = 20, skip = 0) {
  return this.find({ userId })
    .populate('couponId', 'title code storeId')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

CouponBoostSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgImpressions: { $avg: '$impressions' },
        avgClicks: { $avg: '$clicks' },
        avgConversions: { $avg: '$conversions' }
      }
    }
  ]);
};

CouponBoostSchema.statics.getRevenueStats = function(startDate, endDate) {
  const matchStage = {
    status: { $in: ['active', 'expired'] },
    createdAt: { $gte: startDate, $lte: endDate }
  };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          boostType: '$boostType'
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } }
  ]);
};

// Virtual for CTR (Click Through Rate)
CouponBoostSchema.virtual('ctr').get(function() {
  if (this.impressions === 0) return 0;
  return ((this.clicks / this.impressions) * 100).toFixed(2);
});

// Virtual for conversion rate
CouponBoostSchema.virtual('conversionRate').get(function() {
  if (this.clicks === 0) return 0;
  return ((this.conversions / this.clicks) * 100).toFixed(2);
});

// Virtual for remaining days
CouponBoostSchema.virtual('remainingDays').get(function() {
  if (this.status !== 'active') return 0;
  const now = new Date();
  const diff = this.endDate - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Ensure virtual fields are serialized
CouponBoostSchema.set('toJSON', { virtuals: true });
CouponBoostSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CouponBoost', CouponBoostSchema);


