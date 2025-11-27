const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubscriptionPlanSchema = new Schema({
  name: {
    type: String,
    required: true,
    enum: ['Free', 'Basic', 'Pro', 'Enterprise'],
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    monthly: { type: Number, required: true, min: [0, 'Price cannot be negative'] },
    yearly: { type: Number, required: true, min: [0, 'Price cannot be negative'] },
  },
  couponLimit: {
    type: Number,
    required: true,
    default: 5,
  },
  dealLimit: {
    type: Number,
    required: true,
    default: 5,
  },
  storeLimit: {
    type: Number,
    required: true,
    default: 5,
  },
  creditsPerMonth: {
    type: Number,
    default: 0,
  },
  accessToAnalytics: {
    type: Boolean,
    default: false,
  },
  promoteCoupons: {
    type: Boolean,
    default: false,
  },
  features: {
    type: [String],
    default: [],
  },
  highlight: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    required: true,
    default: 1,
  },
  colorTheme: {
    type: String,
    default: '#ffffff',
  },
  isActive: {
    type: Boolean,
    default: true,
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

SubscriptionPlanSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const SubscriptionPlan = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);

module.exports = SubscriptionPlan;
