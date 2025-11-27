const express = require('express');
const router = express.Router();
const rateAndReviewController = require('../controllers/rateAndReviewController');
const authMiddleware = require('../middleware/authMiddleware');

// Create a new rating and review (optional auth - can work with or without)
router.post('/create', authMiddleware, rateAndReviewController.createRateAndReview);

// Get all ratings and reviews
router.get('/all', rateAndReviewController.getAllRatingsAndReviews);

// Get ratings and reviews for a specific coupon
router.get('/coupon/:couponId', rateAndReviewController.getRatingsAndReviewsByCoupon);

// Get ratings and reviews for a specific deal
router.get('/deal/:dealId', rateAndReviewController.getRatingsAndReviewsByDeal);

// Update a rating and review (authenticated)
router.patch('/update/:id', authMiddleware, rateAndReviewController.updateRateAndReview);

// Delete a rating and review (authenticated)
router.delete('/delete/:id', authMiddleware, rateAndReviewController.deleteRateAndReview);

// Get current user's reviews (authenticated)
router.get('/mine', authMiddleware, rateAndReviewController.getMyReviews);

module.exports = router;
