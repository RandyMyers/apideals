const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController'); // Adjust the path as per your project structure

// Route to create a new coupon
router.post('/create', couponController.createCoupon);

// Route to get all coupons
router.get('/all', couponController.getAllCoupons);

// Get trending coupons (must be before /:id route)
router.get('/trending', couponController.getTrendingCoupons);

// Route to get all coupons by userId (must be before /:id route)
router.get('/user/:userId', couponController.getCouponsByUserId);

// Route to check if a coupon is valid (must be before /:id route)
router.get('/:id/validity', couponController.checkCouponValidity);

// Route to get a single coupon by ID (must be last)
router.get('/:id', couponController.getCouponById);

// Route to update a coupon by ID
router.patch('/update/:id', couponController.updateCoupon);

// Route to delete a coupon by ID
router.delete('/delete/:id', couponController.deleteCoupon);

// Route to increment coupon usage
router.patch('/:id/increment', couponController.incrementCouponUsage);

// Bulk upsert
router.post('/bulk', couponController.bulkUpsert);

module.exports = router;
