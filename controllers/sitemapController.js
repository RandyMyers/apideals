/**
 * Sitemap Controller
 * Handles sitemap generation requests
 */

const { 
  generateSitemap, 
  generateSitemapIndex, 
  generateImageSitemap, 
  generateNewsSitemap 
} = require('../utils/sitemapGenerator');
const SEOSettings = require('../models/seoSettings');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const Store = require('../models/store');
const Category = require('../models/category');
const Blog = require('../models/blog');
const HelpArticle = require('../models/helpArticle');

const models = {
  Coupon,
  Deal,
  Store,
  Category,
  Blog,
  HelpArticle,
};

/**
 * Get XML sitemap
 */
exports.getSitemap = async (req, res) => {
  try {
    const baseUrl = process.env.CLIENT_URL || req.protocol + '://' + req.get('host');
    
    // Check if sitemap is enabled
    let sitemapEnabled = true;
    let maxItems = 10000;
    
    try {
      const settings = await SEOSettings.getSettings();
      if (settings && settings.sitemapSettings) {
        sitemapEnabled = settings.sitemapSettings.enabled !== false;
        maxItems = settings.sitemapSettings.maxItemsPerSitemap || 10000;
      }
    } catch (dbError) {
      console.warn('Could not load SEO settings, using defaults');
    }

    if (!sitemapEnabled) {
      return res.status(404).send('Sitemap is disabled');
    }

    const sitemap = await generateSitemap(models, baseUrl);

    // Auto-submit to Search Console if enabled
    try {
      const searchConsoleService = require('../services/searchConsoleService');
      const SearchConsoleSettings = require('../models/searchConsoleSettings');
      const settings = await SearchConsoleSettings.getActiveSettings();
      
      if (settings && settings.isAuthenticated() && settings.autoSubmitSitemap) {
        const siteUrl = process.env.CLIENT_URL || baseUrl;
        const sitemapUrl = `${baseUrl}/sitemap.xml`;
        
        // Submit asynchronously (don't block response)
        searchConsoleService.autoSubmitSitemap(siteUrl, sitemapUrl).catch(err => {
          console.warn('Failed to auto-submit sitemap to Search Console:', err.message);
        });
      }
    } catch (error) {
      // Silently fail - don't break sitemap generation
      console.warn('Search Console auto-submit error:', error.message);
    }

    res.set('Content-Type', 'application/xml');
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({
      error: 'Failed to generate sitemap',
      message: error.message,
    });
  }
};

/**
 * Get sitemap index (for large sites)
 */
exports.getSitemapIndex = async (req, res) => {
  try {
    const baseUrl = process.env.CLIENT_URL || req.protocol + '://' + req.get('host');

    // Get sitemap settings
    let sitemapSettings = {
      includeCoupons: true,
      includeDeals: true,
      includeStores: true,
      includeCategories: true,
      includeBlogs: true,
      includeHelpArticles: true,
    };

    try {
      const settings = await SEOSettings.getSettings();
      if (settings && settings.sitemapSettings) {
        sitemapSettings = settings.sitemapSettings;
      }
    } catch (dbError) {
      console.warn('Could not load SEO settings, using defaults');
    }

    const sitemaps = [
      { path: '/sitemap.xml', lastmod: new Date().toISOString() },
    ];

    // Add image sitemap if enabled
    if (sitemapSettings.includeCoupons || sitemapSettings.includeStores || sitemapSettings.includeBlogs) {
      sitemaps.push({ path: '/sitemap-images.xml', lastmod: new Date().toISOString() });
    }

    // Add news sitemap if blogs are enabled
    if (sitemapSettings.includeBlogs) {
      sitemaps.push({ path: '/sitemap-news.xml', lastmod: new Date().toISOString() });
    }

    const sitemapIndex = generateSitemapIndex(sitemaps, baseUrl);

    res.set('Content-Type', 'application/xml');
    res.status(200).send(sitemapIndex);
  } catch (error) {
    console.error('Error generating sitemap index:', error);
    res.status(500).json({
      error: 'Failed to generate sitemap index',
      message: error.message,
    });
  }
};

/**
 * Get image sitemap
 */
exports.getImageSitemap = async (req, res) => {
  try {
    const baseUrl = process.env.CLIENT_URL || req.protocol + '://' + req.get('host');
    
    let maxItems = 10000;
    try {
      const settings = await SEOSettings.getSettings();
      if (settings && settings.sitemapSettings) {
        maxItems = settings.sitemapSettings.maxItemsPerSitemap || 10000;
      }
    } catch (dbError) {
      console.warn('Could not load SEO settings, using defaults');
    }

    const sitemap = await generateImageSitemap(models, baseUrl, maxItems);

    res.set('Content-Type', 'application/xml');
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('Error generating image sitemap:', error);
    res.status(500).json({
      error: 'Failed to generate image sitemap',
      message: error.message,
    });
  }
};

/**
 * Get news sitemap
 */
exports.getNewsSitemap = async (req, res) => {
  try {
    const baseUrl = process.env.CLIENT_URL || req.protocol + '://' + req.get('host');

    const sitemap = await generateNewsSitemap(models, baseUrl);

    res.set('Content-Type', 'application/xml');
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('Error generating news sitemap:', error);
    res.status(500).json({
      error: 'Failed to generate news sitemap',
      message: error.message,
    });
  }
};

