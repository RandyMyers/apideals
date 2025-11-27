const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    questionTranslations: {
      ga: { type: String, trim: true },
      de: { type: String, trim: true },
      es: { type: String, trim: true },
      it: { type: String, trim: true },
      no: { type: String, trim: true },
      fi: { type: String, trim: true },
      da: { type: String, trim: true },
      sv: { type: String, trim: true },
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    answerTranslations: {
      ga: { type: String },
      de: { type: String },
      es: { type: String },
      it: { type: String },
      no: { type: String },
      fi: { type: String },
      da: { type: String },
      sv: { type: String },
    },
    category: {
      type: String,
      enum: ['general', 'account', 'payment', 'technical', 'coupons', 'deals', 'other'],
      default: 'general',
    },
    order: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FAQ', faqSchema);

