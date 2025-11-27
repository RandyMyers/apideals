const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// DiscountUsage Model (if needed)
const DiscountUsageSchema = new Schema({
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
    discountId: { type: Schema.Types.ObjectId, ref: 'Discount', required: true },
    usedAt: { type: Date, required: true },
    status: { type: String, enum: ['used', 'unused'], default: 'used' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

  const DiscountUsage = mongoose.model('DiscountUsage', DiscountUsageSchema);

  module.exports = DiscountUsage;