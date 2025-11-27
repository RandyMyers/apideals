const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CouponSubmissionSchema = new Schema({
  // User who submitted the coupon
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Store the coupon belongs to
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  
  // Category for the coupon
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },
  
  // Coupon details
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 200
  },
  
  code: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    uppercase: true
  },
  
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  terms: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  
  // Discount details
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  
  minPurchaseAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  
  maxPurchaseAmount: {
    type: Number,
    min: 0
  },
  
  // Validity period
  startDate: {
    type: Date,
    required: true
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
  
  // Usage limits
  usageLimit: {
    type: Number,
    min: 1,
    default: 1
  },
  
  // Proof/verification
  proof: {
    type: String, // URL to proof image
    required: false
  },
  
  proofDescription: {
    type: String,
    maxlength: 500
  },
  
  // Moderation status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending',
    index: true
  },
  
  // Moderation details
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  reviewedAt: {
    type: Date
  },
  
  rejectionReason: {
    type: String,
    maxlength: 1000
  },
  
  adminNotes: {
    type: String,
    maxlength: 1000
  },
  
  // Duplicate detection
  isDuplicate: {
    type: Boolean,
    default: false
  },
  
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon'
  },
  
  // Quality scoring
  qualityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Flags
  isVerified: {
    type: Boolean,
    default: false
  },
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Analytics
  viewCount: {
    type: Number,
    default: 0
  },
  
  clickCount: {
    type: Number,
    default: 0
  },
  
  // External integration
  externalId: {
    type: String, // For WooCommerce sync
    index: true
  },
  
  // Timestamps
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
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

// Indexes for better performance
CouponSubmissionSchema.index({ userId: 1, status: 1 });
CouponSubmissionSchema.index({ storeId: 1, status: 1 });
CouponSubmissionSchema.index({ categoryId: 1, status: 1 });
CouponSubmissionSchema.index({ status: 1, submittedAt: -1 });
CouponSubmissionSchema.index({ code: 1, storeId: 1 });
CouponSubmissionSchema.index({ qualityScore: -1, status: 1 });
CouponSubmissionSchema.index({ endDate: 1, status: 1 });

// Pre-save middleware
CouponSubmissionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-expire if past end date
  if (this.status === 'approved' && this.endDate < new Date()) {
    this.status = 'expired';
  }
  
  next();
});

// Instance methods
CouponSubmissionSchema.methods.approve = function(reviewerId, adminNotes = '') {
  this.status = 'approved';
  this.reviewerId = reviewerId;
  this.reviewedAt = new Date();
  this.adminNotes = adminNotes;
  return this.save();
};

CouponSubmissionSchema.methods.reject = function(reviewerId, rejectionReason, adminNotes = '') {
  this.status = 'rejected';
  this.reviewerId = reviewerId;
  this.reviewedAt = new Date();
  this.rejectionReason = rejectionReason;
  this.adminNotes = adminNotes;
  return this.save();
};

CouponSubmissionSchema.methods.incrementView = function() {
  this.viewCount += 1;
  return this.save();
};

CouponSubmissionSchema.methods.incrementClick = function() {
  this.clickCount += 1;
  return this.save();
};

// Static methods
CouponSubmissionSchema.statics.findPending = function(limit = 20, skip = 0) {
  return this.find({ status: 'pending' })
    .populate('userId', 'username email')
    .populate('storeId', 'name logo')
    .populate('categoryId', 'name')
    .sort({ submittedAt: 1 })
    .limit(limit)
    .skip(skip);
};

CouponSubmissionSchema.statics.findByUser = function(userId, limit = 20, skip = 0) {
  return this.find({ userId })
    .populate('storeId', 'name logo')
    .populate('categoryId', 'name')
    .populate('reviewerId', 'username')
    .sort({ submittedAt: -1 })
    .limit(limit)
    .skip(skip);
};

CouponSubmissionSchema.statics.findDuplicates = function(code, storeId, excludeId = null) {
  const query = { 
    code: code.toUpperCase(), 
    storeId,
    status: { $in: ['pending', 'approved'] }
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return this.find(query);
};

CouponSubmissionSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgQualityScore: { $avg: '$qualityScore' }
      }
    }
  ]);
};

CouponSubmissionSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Virtual for time since submission
CouponSubmissionSchema.virtual('timeSinceSubmission').get(function() {
  const now = new Date();
  const diff = now - this.submittedAt;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
});

// Ensure virtual fields are serialized
CouponSubmissionSchema.set('toJSON', { virtuals: true });
CouponSubmissionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CouponSubmission', CouponSubmissionSchema);


