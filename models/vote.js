const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VoteSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  couponId: {
    type: Schema.Types.ObjectId,
    ref: 'Coupon',
    required: false,
    index: true,
  },
  dealId: {
    type: Schema.Types.ObjectId,
    ref: 'Deal',
    required: false,
    index: true,
  },
  type: {
    type: String,
    enum: ['up', 'down'],
    required: true,
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

// Ensure either couponId or dealId is provided, but not both
VoteSchema.pre('validate', function (next) {
  if (!this.couponId && !this.dealId) {
    return next(new Error('Either couponId or dealId must be provided'));
  }
  if (this.couponId && this.dealId) {
    return next(new Error('Cannot provide both couponId and dealId'));
  }
  next();
});

// Automatically update the updatedAt field before saving
VoteSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Compound indexes for uniqueness
VoteSchema.index({ userId: 1, couponId: 1 }, { unique: true, sparse: true });
VoteSchema.index({ userId: 1, dealId: 1 }, { unique: true, sparse: true });

// Index for efficient vote counting
VoteSchema.index({ couponId: 1, type: 1 });
VoteSchema.index({ dealId: 1, type: 1 });

const Vote = mongoose.model('Vote', VoteSchema);

module.exports = Vote;

