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
  fr: { type: String, trim: true }, // French
  pt: { type: String, trim: true }, // Portuguese
  nl: { type: String, trim: true }, // Dutch
  'en-GB': { type: String, trim: true }, // UK English
  'en-AU': { type: String, trim: true }, // Australian English
  'de-AT': { type: String, trim: true }, // Austrian German

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

// Helper function to convert last key part to camelCase
// e.g., "activeonly" -> "activeOnly", "resultsinfo" -> "resultsInfo", "brandtagline" -> "brandTagline"
function toCamelCase(str) {
  // If already camelCase (contains uppercase), return as-is
  if (str !== str.toLowerCase()) {
    return str;
  }
  
  // Known mappings for common compound words
  const knownMappings = {
    'activeonly': 'activeOnly',
    'resultsinfo': 'resultsInfo',
    'brandtagline': 'brandTagline',
    'branddescription': 'brandDescription',
    'searchplaceholder': 'searchPlaceholder',
    'titlesubtext': 'titleSubtext',
    'activecoupons': 'activeCoupons',
    'titleplaceholder': 'titlePlaceholder',
    'titlerequired': 'titleRequired',
    'descriptionplaceholder': 'descriptionPlaceholder',
    'placeholderfull': 'placeholderFull',
    'viewall': 'viewAll',
    'resultsfor': 'resultsFor',
    'verifiedonly': 'verifiedOnly',
    'allresults': 'allResults',
    'expiringsoonsort': 'expiringSoonSort',
    'noresults': 'noResults',
    'subtitle': 'subtitle', // Already correct
    'emailplaceholder': 'emailPlaceholder',
    'passwordplaceholder': 'passwordPlaceholder',
    'usernameplaceholder': 'usernamePlaceholder',
    'confirmpasswordplaceholder': 'confirmPasswordPlaceholder',
    'codeplaceholder': 'codePlaceholder',
    'termsplaceholder': 'termsPlaceholder',
    'maxpurchaseplaceholder': 'maxPurchasePlaceholder',
    'prooftitle': 'proofTitle',
    'proofdescription': 'proofDescription',
    'proofdescriptionlabel': 'proofDescriptionLabel',
    'proofdescriptionplaceholder': 'proofDescriptionPlaceholder',
    'noactive': 'noActive',
    'tryfilters': 'tryFilters',
    'popularonly': 'popularOnly',
    'searchresults': 'searchResults',
    'nodescription': 'noDescription',
    'ogdescription': 'ogDescription',
    'subjectplaceholder': 'subjectPlaceholder',
    'missiontitle': 'missionTitle',
    'visiontitle': 'visionTitle',
    'valuestitle': 'valuesTitle',
    'dealdescription': 'dealDescription',
    'titleornamerequired': 'titleOrNameRequired',
    'seodescription': 'seoDescription',
    'seotitle': 'seoTitle',
    'seotitledefault': 'seoTitleDefault',
    'seodescriptionfallback': 'seoDescriptionFallback',
    'seodescriptiondefault': 'seoDescriptionDefault',
    'sortlabel': 'sortLabel',
    'descriptionfallback': 'descriptionFallback',
  };
  
  // Check if we have a known mapping
  if (knownMappings[str]) {
    return knownMappings[str];
  }
  
  // Fallback: try to detect word boundaries using common word patterns
  const commonWords = ['active', 'only', 'results', 'info', 'brand', 'tagline', 'description', 
                       'filter', 'sort', 'empty', 'no', 'title', 'subtitle', 'search', 'placeholder',
                       'view', 'grid', 'list', 'newest', 'discount', 'expiring', 'price', 'low', 'high',
                       'email', 'password', 'username', 'confirm', 'code', 'terms', 'max', 'purchase',
                       'proof', 'label', 'try', 'popular', 'subject', 'mission', 'vision', 'values',
                       'deal', 'name', 'required', 'seo', 'default', 'fallback'];
  
  // Try to find where a common word ends
  for (const word of commonWords) {
    if (str.startsWith(word) && str.length > word.length) {
      // Found a word boundary - capitalize the next letter
      return word + str.charAt(word.length).toUpperCase() + str.slice(word.length + 1);
    }
  }
  
  // If no pattern found, return as-is (might be a single word)
  return str;
}

// Static method to get translations for a specific language
translationSchema.statics.getTranslationsForLanguage = async function(language) {
  // Map language variants to base language for fallback
  const langMap = {
    'en-GB': 'en',
    'en-AU': 'en',
    'de-AT': 'de'
  };
  const baseLang = langMap[language] || language;
  
  // Optimize query: only select the fields we need (key and the requested language + base language + English fallback)
  // This reduces data transfer significantly
  const fieldsToSelect = ['key', 'en', baseLang, language].filter((field, index, self) => self.indexOf(field) === index);
  
  // Build select string for Mongoose (handles hyphenated field names)
  const selectString = fieldsToSelect.join(' ');
  
  const translations = await this.find({}).select(selectString).lean();
  
  // Format for react-i18next (nested structure)
  const formatted = {};
  
  translations.forEach(t => {
    // Skip if no key
    if (!t || !t.key) return;
    
    const keys = t.key.split('.');
    let current = formatted;
    
    keys.forEach((key, index) => {
      // Skip empty keys
      if (!key) return;
      
      // Convert last key part to camelCase for client compatibility
      // e.g., "deals.filter.activeonly" -> "deals.filter.activeOnly"
      const camelKey = index === keys.length - 1 ? toCamelCase(key) : key;
      
      if (index === keys.length - 1) {
        // Last key - set the translation value
        // Use requested language if available, otherwise fallback to base language, then English
        if (current && typeof current === 'object') {
          current[camelKey] = t[language] || t[baseLang] || t.en || '';
        }
      } else {
        // Intermediate key - create nested object
        if (!current || typeof current !== 'object') {
          return; // Skip if current is not an object
        }
        if (!current[camelKey]) {
          current[camelKey] = {};
        }
        current = current[camelKey];
        // Safety check
        if (!current || typeof current !== 'object') {
          return; // Skip if we can't continue
        }
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
  // Map language variants to base language for fallback
  const langMap = {
    'en-GB': 'en',
    'en-AU': 'en',
    'de-AT': 'de'
  };
  const baseLang = langMap[language] || language;
  return this[language] || this[baseLang] || this.en || '';
};

// Instance method to check if translation exists for language
translationSchema.methods.hasTranslation = function(language) {
  return !!this[language];
};

module.exports = mongoose.model('Translation', translationSchema);

