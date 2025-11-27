const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// UserSubscription Model
const SubscriptionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    paymentLinkId: { type: Schema.Types.ObjectId, ref: 'PaymentLink', required: false },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: false },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'inactive', 'expired'], default: 'active' },
    nextBillingDate: { type: Date, required: true },
    lastPaymentDate: { type: Date },
    couponLimit: { type: Number, required: true, default: 0 }, // Maximum number of coupons allowed
    dealLimit: { type: Number, required: true, default: 0 },  // Maximum number of deals allowed
    storeLimit: { type: Number, required: true, default: 0 }, // Maximum number of stores allowed
    couponCount: { type: Number, required: true, default: 0 }, // Current usage of coupons
    dealCount: { type: Number, required: true, default: 0 },   // Current usage of deals
    storeCount: { type: Number, required: true, default: 0 },  // Current usage of stores
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

// Middleware to update `updatedAt` field
SubscriptionSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Subscription = mongoose.model('Subscription', SubscriptionSchema);

module.exports = Subscription;
