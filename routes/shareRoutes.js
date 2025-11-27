const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const authMiddleware = require('../middleware/authMiddleware');

// Share routes (authentication optional for tracking)
router.post('/coupon/:couponId', authMiddleware, shareController.shareCoupon);
router.post('/deal/:dealId', authMiddleware, shareController.shareDeal);
router.get('/stats/:entityType/:entityId', shareController.getShareStats);

module.exports = router;

