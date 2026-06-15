const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Category Schema
const CategorySchema = new Schema({
  // Name of the category (e.g., Electronics, Fashion, etc.)
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  // SEO-friendly slug derived from name
  slug: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    index: true,
  },

  // Optional description of the category
  description: {
    type: String,
    trim: true,
  },

  // URL to an image representing the category
  imageUrl: {
    type: String,
    required: false, // Optional field for the category image
  },

  // Reference to the store that owns this category (if applicable)
  storeId: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store', // Reference to the Store model
    required: false, // This could be optional if categories are global
  }],

  // Parent category (for nested categories)
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // Reference to the Category model (for nested categories)
    default: null,
  },

  // ── SEO / AEO fields ──
  seoSlug: { type: String, trim: true, lowercase: true, index: true },
  seoTitle: { type: String, trim: true },
  seoDescription: { type: String, trim: true },
  seoKeywords: [{ type: String, trim: true }],
  h1: { type: String, trim: true },
  intro: { type: String, trim: true },
  /** Long-form HTML below the offers grid (600–800 word SEO guide, FAQs, tips). */
  pageContent: { type: String, trim: false },
  faqs: [{
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    group: { type: String, enum: ['faq', 'paa', 'troubleshooting'], default: 'faq' },
    order: { type: Number, default: 0 },
  }],
  languageTranslations: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
    default: {},
  },
  contentUpdatedAt: { type: Date },

  // Category created and updated timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

CategorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  const contentPaths = ['name', 'description', 'h1', 'intro', 'pageContent', 'faqs', 'seoTitle', 'seoDescription'];
  if (this.isNew || contentPaths.some((p) => this.isModified(p))) {
    this.contentUpdatedAt = new Date();
  }
  next();
});

// Create Category Model (avoid OverwriteModelError in watch/reload)
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
module.exports = Category;
