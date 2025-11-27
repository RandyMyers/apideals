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

module.exports = router;


