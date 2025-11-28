const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // Translation fields for title
    titleTranslations: {
      ga: { type: String, trim: true }, // Irish
      de: { type: String, trim: true }, // German
      es: { type: String, trim: true }, // Spanish
      it: { type: String, trim: true }, // Italian
      no: { type: String, trim: true }, // Norwegian
      fi: { type: String, trim: true }, // Finnish
      da: { type: String, trim: true }, // Danish
      sv: { type: String, trim: true }, // Swedish
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
    // Translation fields for content
    contentTranslations: {
      ga: { type: String }, // Irish
      de: { type: String }, // German
      es: { type: String }, // Spanish
      it: { type: String }, // Italian
      no: { type: String }, // Norwegian
      fi: { type: String }, // Finnish
      da: { type: String }, // Danish
      sv: { type: String }, // Swedish
    },
    excerpt: {
      type: String,
      trim: true,
    },
    // Translation fields for excerpt
    excerptTranslations: {
      ga: { type: String, trim: true }, // Irish
      de: { type: String, trim: true }, // German
      es: { type: String, trim: true }, // Spanish
      it: { type: String, trim: true }, // Italian
      no: { type: String, trim: true }, // Norwegian
      fi: { type: String, trim: true }, // Finnish
      da: { type: String, trim: true }, // Danish
      sv: { type: String, trim: true }, // Swedish
    },
    metaTitle: {
      type: String,
      required: false,
      trim: true,
    },
    // Translation fields for meta title
    metaTitleTranslations: {
      ga: { type: String, trim: true }, // Irish
      de: { type: String, trim: true }, // German
      es: { type: String, trim: true }, // Spanish
      it: { type: String, trim: true }, // Italian
      no: { type: String, trim: true }, // Norwegian
      fi: { type: String, trim: true }, // Finnish
      da: { type: String, trim: true }, // Danish
      sv: { type: String, trim: true }, // Swedish
    },
    metaDescription: {
      type: String,
      required: false,
      trim: true,
    },
    // Translation fields for meta description
    metaDescriptionTranslations: {
      ga: { type: String, trim: true }, // Irish
      de: { type: String, trim: true }, // German
      es: { type: String, trim: true }, // Spanish
      it: { type: String, trim: true }, // Italian
      no: { type: String, trim: true }, // Norwegian
      fi: { type: String, trim: true }, // Finnish
      da: { type: String, trim: true }, // Danish
      sv: { type: String, trim: true }, // Swedish
    },
    keywords: {
      type: [String],
      default: [],
    },
    // Translation fields for keywords (object with arrays per language)
    keywordsTranslations: {
      type: Map,
      of: [String],
      default: {},
    },
    focusKeyword: {
      type: String,
      required: false,
      trim: true,
    },
    // Translation fields for focus keyword
    focusKeywordTranslations: {
      ga: { type: String, trim: true }, // Irish
      de: { type: String, trim: true }, // German
      es: { type: String, trim: true }, // Spanish
      it: { type: String, trim: true }, // Italian
      no: { type: String, trim: true }, // Norwegian
      fi: { type: String, trim: true }, // Finnish
      da: { type: String, trim: true }, // Danish
      sv: { type: String, trim: true }, // Swedish
    },
    tags: {
      type: [String],
      default: [],
    },
    // Translation fields for tags (object with arrays per language)
    tagsTranslations: {
      type: Map,
      of: [String],
      default: {},
    },
    // Translation fields for tags (object with arrays per language)
    tagsTranslations: {
      type: Map,
      of: [String],
      default: {},
    },
    featuredImage: {
      type: String,
      required: false,
      trim: true,
    },
    featuredImageAlt: {
      type: String,
      required: false,
      trim: true,
    },
    canonicalURL: {
      type: String,
      required: false,
      trim: true,
    },
    // Open Graph fields
    ogTitle: {
      type: String,
      required: false,
      trim: true,
    },
    // Translation fields for OG title
    ogTitleTranslations: {
      ga: { type: String, trim: true }, // Irish
      de: { type: String, trim: true }, // German
      es: { type: String, trim: true }, // Spanish
      it: { type: String, trim: true }, // Italian
      no: { type: String, trim: true }, // Norwegian
      fi: { type: String, trim: true }, // Finnish
      da: { type: String, trim: true }, // Danish
      sv: { type: String, trim: true }, // Swedish
    },
    ogDescription: {
      type: String,
      required: false,
      trim: true,
    },
    // Translation fields for OG description
    ogDescriptionTranslations: {
      ga: { type: String, trim: true }, // Irish
      de: { type: String, trim: true }, // German
      es: { type: String, trim: true }, // Spanish
      it: { type: String, trim: true }, // Italian
      no: { type: String, trim: true }, // Norwegian
      fi: { type: String, trim: true }, // Finnish
      da: { type: String, trim: true }, // Danish
      sv: { type: String, trim: true }, // Swedish
    },
    ogImage: {
      type: String,
      required: false,
      trim: true,
    },
    ogUrl: {
      type: String,
      required: false,
      trim: true,
    },
    // Twitter Card fields
    twitterCard: {
      type: String,
      enum: ['summary', 'summary_large_image', 'app', 'player'],
      default: 'summary_large_image',
    },
    twitterTitle: {
      type: String,
      required: false,
      trim: true,
    },
    // Translation fields for Twitter title
    twitterTitleTranslations: {
      ga: { type: String, trim: true }, // Irish
      de: { type: String, trim: true }, // German
      es: { type: String, trim: true }, // Spanish
      it: { type: String, trim: true }, // Italian
      no: { type: String, trim: true }, // Norwegian
      fi: { type: String, trim: true }, // Finnish
      da: { type: String, trim: true }, // Danish
      sv: { type: String, trim: true }, // Swedish
    },
    twitterDescription: {
      type: String,
      required: false,
      trim: true,
    },
    // Translation fields for Twitter description
    twitterDescriptionTranslations: {
      ga: { type: String, trim: true }, // Irish
      de: { type: String, trim: true }, // German
      es: { type: String, trim: true }, // Spanish
      it: { type: String, trim: true }, // Italian
      no: { type: String, trim: true }, // Norwegian
      fi: { type: String, trim: true }, // Finnish
      da: { type: String, trim: true }, // Danish
      sv: { type: String, trim: true }, // Swedish
    },
    twitterImage: {
      type: String,
      required: false,
      trim: true,
    },
    // Schema.org structured data
    articleSchema: {
      publisher: {
        type: String,
        trim: true,
        default: 'DealCouponz',
      },
      articleSection: {
        type: String,
        trim: true,
      },
    },
    // Reading time (calculated in minutes)
    readingTime: {
      type: Number,
      default: 1,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    likes: {
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

module.exports = mongoose.model('Blog', blogSchema);
