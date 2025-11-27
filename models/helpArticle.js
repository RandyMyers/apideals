const mongoose = require('mongoose');

const helpArticleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    titleTranslations: {
      ga: { type: String, trim: true },
      de: { type: String, trim: true },
      es: { type: String, trim: true },
      it: { type: String, trim: true },
      no: { type: String, trim: true },
      fi: { type: String, trim: true },
      da: { type: String, trim: true },
      sv: { type: String, trim: true },
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    content: {
      type: String,
      required: true,
    },
    contentTranslations: {
      ga: { type: String },
      de: { type: String },
      es: { type: String },
      it: { type: String },
      no: { type: String },
      fi: { type: String },
      da: { type: String },
      sv: { type: String },
    },
    excerpt: {
      type: String,
      trim: true,
    },
    excerptTranslations: {
      ga: { type: String, trim: true },
      de: { type: String, trim: true },
      es: { type: String, trim: true },
      it: { type: String, trim: true },
      no: { type: String, trim: true },
      fi: { type: String, trim: true },
      da: { type: String, trim: true },
      sv: { type: String, trim: true },
    },
    category: {
      type: String,
      enum: ['getting-started', 'account', 'payments', 'troubleshooting', 'coupons', 'deals', 'stores', 'other'],
      required: true,
    },
    tags: {
      type: [String],
      default: [],
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

// Index for faster queries
helpArticleSchema.index({ slug: 1 });
helpArticleSchema.index({ category: 1, isPublished: 1 });

module.exports = mongoose.model('HelpArticle', helpArticleSchema);

