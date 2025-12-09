/**
 * Activity Routes
 * Handles activity-related endpoints
 */

const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// GET /api/v1/activities/recent?limit=10
// Admin only - Get recent activities for dashboard
const allowedAdminTypes = ['superAdmin', 'couponManager', 'customerSupport', 'contentEditor', 'marketingManager'];
router.get('/recent', authMiddleware, adminMiddleware(allowedAdminTypes), activityController.getRecentActivities);

// GET /api/v1/activities/all - Get all user activities (Admin only)
// Queries View, Interaction, and CouponUsage models directly
router.get('/all', authMiddleware, adminMiddleware(allowedAdminTypes), activityController.getAllActivities);

// GET /api/v1/activities/top-pages - Get top pages by view count (Admin only)
router.get('/top-pages', authMiddleware, adminMiddleware(allowedAdminTypes), activityController.getTopPages);

// GET /api/v1/activities/live - Get live activity (active visitors) (Admin only)
router.get('/live', authMiddleware, adminMiddleware(allowedAdminTypes), activityController.getLiveActivity);

module.exports = router;


