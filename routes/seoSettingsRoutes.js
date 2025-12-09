/**
 * SEO Settings Routes
 * Routes for managing SEO settings
 */

const express = require('express');
const router = express.Router();
const seoSettingsController = require('../controllers/seoSettingsController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Get SEO settings (public endpoint for verification tags only)
router.get('/public', seoSettingsController.getPublicSettings);

// Get SEO settings (public for some fields, admin for sensitive fields)
router.get('/', authMiddleware, adminMiddleware, seoSettingsController.getSettings);

// Update SEO settings (admin only)
router.put('/', authMiddleware, adminMiddleware, seoSettingsController.updateSettings);

module.exports = router;

