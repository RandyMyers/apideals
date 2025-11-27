const express = require('express');
const couponUsageController = require('../controllers/couponUsageController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Mark coupon/deal as used
router.post('/', authMiddleware, couponUsageController.markAsUsed);

// Get user's usage history
router.get('/user/:userId', authMiddleware, couponUsageController.getUserUsageHistory);

// Get user's savings statistics
router.get('/user/:userId/statistics', authMiddleware, couponUsageController.getUserSavingsStatistics);

module.exports = router;

