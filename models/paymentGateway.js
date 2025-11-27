const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaymentGatewaySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['flutterwave', 'stripe', 'paypal', 'crypto', 'bank_transfer', 'paystack'],
    index: true
  },
  displayName: {
    type: String,
    required: true // e.g., "Flutterwave", "Stripe", "PayPal"
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isEnabled: {
    type: Boolean,
    default: true, // Master switch - if false, completely disabled
    index: true
  },
  icon: {
    type: String, // Icon class or URL
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  supportedCurrencies: [{
    type: String,
    uppercase: true
  }],
  metadata: {
    type: Schema.Types.Mixed,
    default: {} // Store gateway-specific settings
  },
  // API keys are stored in Settings model, not here
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

PaymentGatewaySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get active payment gateways
PaymentGatewaySchema.statics.getActiveGateways = async function () {
  return await this.find({ 
    isActive: true, 
    isEnabled: true 
  }).sort({ displayName: 1 });
};

// Static method to get all gateways (for admin)
PaymentGatewaySchema.statics.getAllGateways = async function () {
  return await this.find().sort({ displayName: 1 });
};

// Instance method to check if gateway is available
PaymentGatewaySchema.methods.isAvailable = function () {
  return this.isActive && this.isEnabled;
};

const PaymentGateway = mongoose.model('PaymentGateway', PaymentGatewaySchema);

module.exports = PaymentGateway;


