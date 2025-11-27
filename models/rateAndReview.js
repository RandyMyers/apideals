const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RateAndReviewSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true, // Reference to the user who rated or reviewed
  },
  couponId: {
    type: Schema.Types.ObjectId,
    ref: 'Coupon', // Reference to the coupon being reviewed
    
  },
  dealId: {
    type: Schema.Types.ObjectId,
    ref: 'Deal', // Reference to the deal being reviewed
    
  },
  rating: {
    type: Number,
    required: true, // The rating value
    min: 1,         // Minimum rating value
    max: 5,         // Maximum rating value
  },
  reviewText: {
    type: String,
    default: '', // Optional review text
    maxlength: 1000, // Limit to 1000 characters
  },
  createdAt: {
    type: Date,
    default: Date.now, // Timestamp for when the review was created
  },
  updatedAt: {
    type: Date,
    default: Date.now, // Timestamp for the last update
  },
});

// Automatically update the `updatedAt` field before saving
RateAndReviewSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const RateAndReview = mongoose.model('RateAndReview', RateAndReviewSchema);

module.exports = RateAndReview;
