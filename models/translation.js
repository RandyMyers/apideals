/**
 * Translation Model
 * Stores translations for all supported languages
 */

const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema({
  // Translation key (e.g., 'nav.home', 'button.submit')
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9._-]+$/, // Only lowercase letters, numbers, dots, underscores, hyphens
  },

  // Category for organization
  category: {
    type: String,
    required: true,
    enum: ['navigation', 'buttons', 'forms', 'messages', 'pages', 'common', 'footer', 'header'],
    default: 'common',
    index: true,
  },

  // Translations for each language
  // English is required (default language)
  en: {
    type: String,
    required: true,
    trim: true,
  },

  // Other languages (optional)
  ga: { type: String, trim: true }, // Irish
  de: { type: String, trim: true }, // German
  es: { type: String, trim: true }, // Spanish
  it: { type: String, trim: true }, // Italian
  no: { type: String, trim: true }, // Norwegian
  fi: { type: String, trim: true }, // Finnish
  da: { type: String, trim: true }, // Danish
  sv: { type: String, trim: true }, // Swedish

  // Metadata
  description: {
    type: String,
    trim: true,
  },
  context: {
    type: String,
    trim: true,
  },
  
  // Usage tracking
  usageCount: {
    type: Number,
    default: 0,
  },
  lastUsed: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for faster queries
translationSchema.index({ category: 1, key: 1 });
translationSchema.index({ category: 1 });
translationSchema.index({ 'en': 'text', 'description': 'text' }); // Full-text search

// Static method to get translations for a specific language
translationSchema.statics.getTranslationsForLanguage = async function(language) {
  // Select all fields, but we'll only use the ones we need
  const translations = await this.find({}).lean();
  
  // Format for react-i18next (nested structure)
  const formatted = {};
  
  translations.forEach(t => {
    const keys = t.key.split('.');
    let current = formatted;
    
    keys.forEach((key, index) => {
      if (index === keys.length - 1) {
        // Last key - set the translation value
        // Use requested language if available, otherwise fallback to English
        current[key] = t[language] || t.en || '';
      } else {
        // Intermediate key - create nested object
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key];
      }
    });
  });
  
  return formatted;
};

// Static method to get all translations (admin)
translationSchema.statics.getAllTranslations = async function() {
  return await this.find({}).sort({ category: 1, key: 1 }).lean();
};

// Static method to get translation by key
translationSchema.statics.getTranslationByKey = async function(key) {
  return await this.findOne({ key: key.toLowerCase() });
};

// Static method to check if translation exists
translationSchema.statics.translationExists = async function(key) {
  const count = await this.countDocuments({ key: key.toLowerCase() });
  return count > 0;
};

// Instance method to get translation for a specific language
translationSchema.methods.getTranslation = function(language) {
  return this[language] || this.en || '';
};

// Instance method to check if translation exists for language
translationSchema.methods.hasTranslation = function(language) {
  return !!this[language];
};

module.exports = mongoose.model('Translation', translationSchema);

