const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { generateSlug } = require('../utils/seoUtils');

const StoreLandingPageSchema = new Schema({
  // Multi-site tenant scope
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: false, // optional until migration/backfill
    index: true,
  },

  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true,
  },

  title: { type: String, required: true, trim: true },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },

  description: { type: String, required: false, trim: true },

  // SEO fields
  seoTitle: { type: String, required: false, trim: true },
  seoDescription: { type: String, required: false, trim: true },
  canonicalUrl: { type: String, required: false, trim: true },

  // Publishing / availability
  isActive: { type: Boolean, default: true },
  isPublished: { type: Boolean, default: true },
  availableCountries: { type: [String], default: ['WORLDWIDE'] },
  isWorldwide: { type: Boolean, default: true },

  // Filter definition
  offerTypes: {
    type: [String],
    enum: ['deals', 'coupons'],
    default: ['deals', 'coupons'],
  },

  entityType: { type: String, required: false, trim: true }, // e.g. hotel | flight
  entityLocation: { type: String, required: false, trim: true }, // e.g. Barcelona, ES
  entityTags: { type: [String], required: false, default: [] },
  keyword: { type: String, required: false, trim: true },

  // Future geo support (optional, not used yet)
  geo: {
    lat: { type: Number, required: false },
    lng: { type: Number, required: false },
  },
  radiusKm: { type: Number, required: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

StoreLandingPageSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (!this.slug && this.title) {
    this.slug = generateSlug(this.title);
  }
  next();
});

// Unique per tenant + store + slug (stable URL)
StoreLandingPageSchema.index(
  { siteId: 1, storeId: 1, slug: 1 },
  { unique: true, name: 'uniq_site_store_slug' }
);

module.exports = mongoose.model('StoreLandingPage', StoreLandingPageSchema);

