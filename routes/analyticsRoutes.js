const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// All analytics routes require authentication and admin access
// Allow all admin user types for analytics
const allowedAdminTypes = ['superAdmin', 'couponManager', 'customerSupport', 'contentEditor', 'marketingManager'];
router.use(authMiddleware);
router.use(adminMiddleware(allowedAdminTypes));

// Get users aggregated by location
router.get('/users/by-location', analyticsController.getUsersByLocation);

// Get visitors aggregated by location
router.get('/visitors/by-location', analyticsController.getVisitorsByLocation);

// Get total users and visitors statistics
router.get('/total-users', analyticsController.getTotalUsers);

// Get views aggregated by location
router.get('/views/by-location', analyticsController.getViewsByLocation);

// Get interactions aggregated by location
router.get('/interactions/by-location', analyticsController.getInteractionsByLocation);

module.exports = router;


