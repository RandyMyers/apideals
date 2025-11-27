/**
 * SEO Settings Model
 * Stores global SEO configuration
 */

const mongoose = require('mongoose');

const seoSettingsSchema = new mongoose.Schema(
  {
    // Site-wide SEO settings
    siteName: {
      type: String,
      default: 'DealCouponz',
    },
    defaultTitle: {
      type: String,
      default: 'DealCouponz - Best Coupons & Deals',
    },
    defaultDescription: {
      type: String,
      default: 'Find the best coupons, deals, and discounts from top stores. Save money with verified promo codes.',
    },
    defaultImage: {
      type: String,
      default: '',
    },
    defaultKeywords: {
      type: [String],
      default: ['coupons', 'deals', 'discounts', 'promo codes', 'savings'],
    },
    siteUrl: {
      type: String,
      default: 'https://dealcouponz.com',
    },
    twitterHandle: {
      type: String,
      default: '@dealcouponz',
    },
    facebookAppId: {
      type: String,
      default: '',
    },

    // Robots.txt settings
    robotsTxt: {
      allowAll: {
        type: Boolean,
        default: true,
      },
      disallowPaths: {
        type: [String],
        default: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/profile/',
          '/my-submissions/',
          '/auth/',
          '/login',
          '/register',
        ],
      },
      allowPaths: {
        type: [String],
        default: [],
      },
      crawlDelay: {
        type: Number,
        default: null,
      },
    },

    // Sitemap settings
    sitemapSettings: {
      enabled: {
        type: Boolean,
        default: true,
      },
      includeCoupons: {
        type: Boolean,
        default: true,
      },
      includeDeals: {
        type: Boolean,
        default: true,
      },
      includeStores: {
        type: Boolean,
        default: true,
      },
      includeCategories: {
        type: Boolean,
        default: true,
      },
      includeBlogs: {
        type: Boolean,
        default: true,
      },
      includeHelpArticles: {
        type: Boolean,
        default: true,
      },
      maxItemsPerSitemap: {
        type: Number,
        default: 10000,
      },
    },

    // Google Search Console settings
    searchConsole: {
      enabled: {
        type: Boolean,
        default: false,
      },
      clientId: {
        type: String,
        default: '',
      },
      clientSecret: {
        type: String,
        default: '',
      },
      refreshToken: {
        type: String,
        default: '',
      },
      siteUrl: {
        type: String,
        default: '',
      },
      autoSubmitSitemap: {
        type: Boolean,
        default: false,
      },
    },

    // Schema.org settings
    schemaSettings: {
      organization: {
        name: {
          type: String,
          default: 'DealCouponz',
        },
        url: {
          type: String,
          default: 'https://dealcouponz.com',
        },
        logo: {
          type: String,
          default: 'https://dealcouponz.com/logo.png',
        },
        sameAs: {
          type: [String],
          default: [],
        },
        contactPoint: {
          contactType: {
            type: String,
            default: 'Customer Service',
          },
          email: {
            type: String,
            default: 'support@dealcouponz.com',
          },
        },
      },
    },

    // Last updated
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create a single document (singleton pattern)
seoSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

seoSettingsSchema.statics.updateSettings = async function (updates) {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(updates);
  } else {
    Object.assign(settings, updates);
    settings.lastUpdated = new Date();
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model('SEOSettings', seoSettingsSchema);

