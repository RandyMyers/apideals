/**
 * Language Settings Model
 * Stores multi-language configuration and translation settings
 */

const mongoose = require('mongoose');

const languageSettingsSchema = new mongoose.Schema({
  // Enabled languages
  enabledLanguages: [{
    code: {
      type: String,
      required: true,
    },
    locale: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    nativeName: {
      type: String,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  }],

  // Default language
  defaultLanguage: {
    type: String,
    default: 'en',
  },

  // Language detection settings
  autoDetect: {
    type: Boolean,
    default: true,
  },
  useBrowserLanguage: {
    type: Boolean,
    default: true,
  },
  useGeolocation: {
    type: Boolean,
    default: false,
  },

  // URL structure
  urlStructure: {
    type: String,
    enum: ['subdirectory', 'subdomain', 'query-parameter'],
    default: 'subdirectory',
  },

  // hreflang settings
  hreflangEnabled: {
    type: Boolean,
    default: true,
  },
  xDefaultLanguage: {
    type: String,
    default: 'en',
  },

  // Translation settings
  autoTranslate: {
    type: Boolean,
    default: false,
  },
  translationProvider: {
    type: String,
    enum: ['google', 'microsoft', 'custom', 'none'],
    default: 'none',
  },
  translationApiKey: {
    type: String,
    required: false,
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Static method to get or create settings
languageSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      enabledLanguages: [
        {
          code: 'en',
          locale: 'en-US',
          name: 'English',
          nativeName: 'English',
          isDefault: true,
          isActive: true,
        },
      ],
      defaultLanguage: 'en',
      xDefaultLanguage: 'en',
    });
  }
  return settings;
};

module.exports = mongoose.model('LanguageSettings', languageSettingsSchema);

