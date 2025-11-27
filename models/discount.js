const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DiscountSchema = new Schema({
    code: {
      type: String,
      required: true, // Unique discount code
      unique: true,
    },
    description: {
      type: String, // Optional: A description of the discount
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'], // Percentage or fixed amount
      required: true,
    },
    discountValue: {
      type: Number,
      required: true, // The discount amount or percentage
    },
    applicableTo: {
      type: [String], // Plan names this discount applies to, e.g., ['Basic', 'Pro']
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date, // Start of discount validity
      required: true,
    },
    endDate: {
      type: Date, // End of discount validity
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
  
  DiscountSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
  });
  
  const Discount = mongoose.model('Discount', DiscountSchema);
  
  module.exports = Discount;
  