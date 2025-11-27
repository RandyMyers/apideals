/**
 * Translation Routes
 * API routes for translation management
 */

const express = require('express');
const router = express.Router();
const translationController = require('../controllers/translationController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// IMPORTANT: Admin routes must come BEFORE the :lang route to avoid route matching conflicts
// Admin routes - require authentication and admin access
// Allow all admin user types for translation management
const allowedAdminTypes = ['superAdmin', 'couponManager', 'customerSupport', 'contentEditor', 'marketingManager'];
router.get('/admin/all', authMiddleware, adminMiddleware(allowedAdminTypes), translationController.getAllTranslations);
router.get('/admin/stats', authMiddleware, adminMiddleware(allowedAdminTypes), translationController.getTranslationStats);
router.post('/admin/bulk', authMiddleware, adminMiddleware(allowedAdminTypes), translationController.bulkUpdateTranslations);
router.post('/admin', authMiddleware, adminMiddleware(allowedAdminTypes), translationController.createTranslation);
router.get('/admin/:key', authMiddleware, adminMiddleware(allowedAdminTypes), translationController.getTranslationByKey);
router.put('/admin/:key', authMiddleware, adminMiddleware(allowedAdminTypes), translationController.updateTranslation);
router.delete('/admin/:key', authMiddleware, adminMiddleware(allowedAdminTypes), translationController.deleteTranslation);

// Public route - Get translations for a language (must be last to avoid matching admin routes)
router.get('/:lang', translationController.getTranslations);

module.exports = router;

