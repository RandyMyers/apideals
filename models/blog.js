const mongoose = require('mongoose');
const { buildStringLocaleSchema } = require('../constants/blogLocales');

const localeStrings = buildStringLocaleSchema({ trim: true });
const localeContent = buildStringLocaleSchema({ trim: false });

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    titleTranslations: localeStrings,
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
    contentTranslations: localeContent,
    excerpt: {
      type: String,
      trim: true,
    },
    excerptTranslations: localeStrings,
    metaTitle: {
      type: String,
      required: false,
      trim: true,
    },
    metaTitleTranslations: localeStrings,
    metaDescription: {
      type: String,
      required: false,
      trim: true,
    },
    metaDescriptionTranslations: localeStrings,
    keywords: {
      type: [String],
      default: [],
    },
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
    focusKeywordTranslations: localeStrings,
    tags: {
      type: [String],
      default: [],
    },
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
    ogTitle: {
      type: String,
      required: false,
      trim: true,
    },
    ogTitleTranslations: localeStrings,
    ogDescription: {
      type: String,
      required: false,
      trim: true,
    },
    ogDescriptionTranslations: localeStrings,
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
    twitterTitleTranslations: localeStrings,
    twitterDescription: {
      type: String,
      required: false,
      trim: true,
    },
    twitterDescriptionTranslations: localeStrings,
    twitterImage: {
      type: String,
      required: false,
      trim: true,
    },
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
