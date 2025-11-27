const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Track daily/hourly spend per campaign
const CampaignSpendSchema = new Schema({
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  spend: {
    type: Number,
    required: true,
    min: 0
  },
  impressions: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
CampaignSpendSchema.index({ campaignId: 1, date: 1 });
CampaignSpendSchema.index({ date: 1 });

const CampaignSpend = mongoose.model('CampaignSpend', CampaignSpendSchema);
module.exports = CampaignSpend;

