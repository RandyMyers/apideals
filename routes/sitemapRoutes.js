/**
 * Sitemap Routes
 * Routes for sitemap generation
 */

const express = require('express');
const router = express.Router();
const sitemapController = require('../controllers/sitemapController');

// XML Sitemap (main)
router.get('/sitemap.xml', sitemapController.getSitemap);

// Sitemap Index (for large sites)
router.get('/sitemap-index.xml', sitemapController.getSitemapIndex);

// Image Sitemap
router.get('/sitemap-images.xml', sitemapController.getImageSitemap);

// News Sitemap
router.get('/sitemap-news.xml', sitemapController.getNewsSitemap);

module.exports = router;

