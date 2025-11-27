/**
 * Search Console Routes
 * API routes for Google Search Console integration
 */

const express = require('express');
const router = express.Router();
const searchConsoleController = require('../controllers/searchConsoleController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// All routes require authentication and admin access
// Allow all admin user types for Search Console
const allowedAdminTypes = ['superAdmin', 'couponManager', 'customerSupport', 'contentEditor', 'marketingManager'];
router.use(authMiddleware);
router.use(adminMiddleware(allowedAdminTypes));

// OAuth routes
router.get('/auth/url', searchConsoleController.getAuthUrl);
router.get('/oauth/callback', searchConsoleController.handleOAuthCallback);

// Settings routes
router.get('/settings', searchConsoleController.getSettings);
router.put('/settings', searchConsoleController.updateSettings);
router.post('/disconnect', searchConsoleController.disconnect);

// Site routes
router.get('/sites', searchConsoleController.getSites);

// Analytics routes
router.get('/sites/:siteUrl/analytics', searchConsoleController.getSearchAnalytics);

// Sitemap routes
router.post('/sites/:siteUrl/sitemaps', searchConsoleController.submitSitemap);
router.get('/sites/:siteUrl/sitemaps', searchConsoleController.listSitemaps);
router.delete('/sites/:siteUrl/sitemaps/:feedpath', searchConsoleController.deleteSitemap);

module.exports = router;

