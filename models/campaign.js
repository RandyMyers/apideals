const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CampaignSchema = new Schema({
  // Campaign owner
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Campaign type
  campaignType: {
    type: String,
    enum: ['store', 'coupon', 'deal'],
    required: true
  },
  
  // Target item being promoted
  targetId: {
    type: Schema.Types.ObjectId,
    required: true,
    // References Store, Coupon, or Deal based on campaignType
  },
  
  // Campaign details
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Budget & Bidding
  totalBudget: {
    type: Number,
    required: true,
    min: [5, 'Total budget must be at least $5']
  },
  dailyBudget: {
    type: Number,
    required: true,
    min: [5, 'Daily budget must be at least $5']
  },
  currentSpend: {
    type: Number,
    default: 0
  },
  
  // Bidding model
  biddingType: {
    type: String,
    enum: ['CPC', 'CPM', 'CPA'],
    default: 'CPC',
    required: true
  },
  
  // Bid amount (varies by bidding type)
  bidAmount: {
    type: Number,
    required: true,
    min: [0.01, 'Bid must be at least $0.01']
  },
  // For CPC: amount per click
  // For CPM: amount per 1000 impressions
  // For CPA: amount per action/conversion
  
  // Reserved budget from wallet (held when campaign activates)
  reservedBudget: {
    type: Number,
    default: 0
  },
  
  // Actual cost per click/interaction (for second-price auction)
  actualCPC: {
    type: Number,
    default: 0
  },
  
  // Campaign duration
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(endDate) {
        return endDate > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  
  // Campaign status
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'expired', 'cancelled'],
    default: 'draft'
  },
  
  // Placement priority (calculated field, updated daily)
  priorityScore: {
    type: Number,
    default: 0 // Higher = better placement
  },
  
  // Performance metrics
  metrics: {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 }, // Redemptions/applications
    ctr: { type: Number, default: 0 }, // Click-through rate
    cpc: { type: Number, default: 0 }, // Cost per click (if tracking)
    roi: { type: Number, default: 0 } // Return on investment
  },
  
  // Payment tracking
  paymentId: {
    type: Schema.Types.ObjectId,
    ref: 'Payment'
  },
  
  // Campaign settings
  settings: {
    targetAudience: String, // Keep for backward compatibility
    targetCountries: {
      type: [String], // Array of country names or 'WORLDWIDE'
      default: ['WORLDWIDE'], // Default to worldwide targeting
    },
    isWorldwide: {
      type: Boolean,
      default: true, // If true, target all countries
    },
    placement: {
      type: String,
      enum: ['homepage', 'category', 'search', 'all'],
      default: 'all'
    },
    maxImpressions: Number,
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastPriorityUpdate: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update priority score before save
CampaignSchema.pre('save', async function(next) {
  if (this.status === 'active') {
    // Calculate priority score: 70% bid, 30% performance
    const performanceScore = Math.min(
      (this.metrics.ctr * 50) + (this.metrics.conversions * 10),
      100
    ); // Normalize to 0-100
    this.priorityScore = (this.bidAmount * 0.7) + (performanceScore * 0.3);
    this.lastPriorityUpdate = Date.now();
  }
  this.updatedAt = Date.now();
  next();
});

// Indexes for performance
CampaignSchema.index({ campaignType: 1, status: 1, priorityScore: -1 });
CampaignSchema.index({ userId: 1 });
CampaignSchema.index({ targetId: 1, campaignType: 1 });
CampaignSchema.index({ status: 1, startDate: 1, endDate: 1 });

const Campaign = mongoose.model('Campaign', CampaignSchema);
module.exports = Campaign;

