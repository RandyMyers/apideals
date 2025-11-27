/**
 * Performance Routes
 * API routes for performance metrics
 */

const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/performanceController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public route for submitting metrics (no auth required for tracking)
router.post('/metrics', performanceController.submitMetrics);

// Admin routes require authentication
// Allow all admin user types for performance metrics
const allowedAdminTypes = ['superAdmin', 'couponManager', 'customerSupport', 'contentEditor', 'marketingManager'];
router.get('/pages', authMiddleware, adminMiddleware(allowedAdminTypes), performanceController.getPagesWithMetrics);
router.get('/pages/:pageUrl', authMiddleware, adminMiddleware(allowedAdminTypes), performanceController.getPageMetrics);
router.get('/pages/:pageUrl/trends', authMiddleware, adminMiddleware(allowedAdminTypes), performanceController.getPerformanceTrends);

module.exports = router;

