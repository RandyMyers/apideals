const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// PaymentLink Model
const PaymentLinkSchema = new Schema({
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    paymentMethod: { type: String, enum: ['stripe', 'bank_transfer', 'authorize'], required: true },
    details: { type: Map, of: String, required: true }, // For storing API keys or account numbers
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

  const PaymentLink = mongoose.model('PaymentLink', PaymentLinkSchema);

  module.exports = PaymentLink;