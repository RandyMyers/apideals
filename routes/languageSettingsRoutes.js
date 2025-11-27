/**
 * Language Settings Routes
 * API routes for language settings management
 */

const express = require('express');
const router = express.Router();
const languageSettingsController = require('../controllers/languageSettingsController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public route to get language settings (for client app)
router.get('/public', languageSettingsController.getLanguageSettings);

// Admin routes (require authentication)
// Allow all admin user types for language settings management
const allowedAdminTypes = ['superAdmin', 'couponManager', 'customerSupport', 'contentEditor', 'marketingManager'];
router.get('/', authMiddleware, adminMiddleware(allowedAdminTypes), languageSettingsController.getLanguageSettings);
router.put('/', authMiddleware, adminMiddleware(allowedAdminTypes), languageSettingsController.updateLanguageSettings);

module.exports = router;

