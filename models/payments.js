const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaymentSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
  },
  subscriptionPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan', // Reference to the SubscriptionPlan model
    required: false, // Optional for wallet deposits
  },
  paymentLinkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentLink', // Reference to the PaymentLink model
    required: false, // Optional for wallet deposits
  },
  amount: {
    type: Number,
    required: true, // The amount paid for the subscription
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  type: {
    type: String,
    enum: ['subscription', 'wallet_deposit', 'wallet_withdrawal'],
    default: 'subscription'
  },
  paymentMethod: {
    type: String,
    required: false, // Optional for wallet deposits (will be set from payment gateway)
    default: 'Flutterwave', // Default for wallet deposits
  },
  paymentStatus: {
    type: String,
    enum: ['Success', 'Failed', 'Pending'],
    required: true, // Status of the payment
  },
  paymentDate: {
    type: Date,
    default: Date.now, // Date of the payment transaction
  },
  transactionId: {
    type: String,
    required: true, // Unique transaction identifier for the payment
    unique: true,
  },
  receiptUrl: {
    type: String,
    required: false, // URL of the payment receipt
  },
  creditsDeposited: {
    type: Number,
    default: 0, // Amount of credits deposited (if applicable for ad credits)
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {} // Additional metadata for payments
  },
  isRefunded: {
    type: Boolean,
    default: false, // Whether the payment has been refunded
  },
  refundDate: {
    type: Date, // If refunded, the date of refund
  },
  createdAt: {
    type: Date,
    default: Date.now, // When the payment record was created
  },
  updatedAt: {
    type: Date,
    default: Date.now, // When the payment record was last updated
  },
});

// Automatically set updatedAt before saving
PaymentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if payment was successful
PaymentSchema.methods.isPaymentSuccessful = function () {
  return this.paymentStatus === 'Success';
};

const Payment = mongoose.model('Payment', PaymentSchema);

module.exports = Payment;
