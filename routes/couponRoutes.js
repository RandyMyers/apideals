const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController'); // Adjust the path as per your project structure

// Route to create a new coupon
router.post('/create', couponController.createCoupon);

// Route to get all coupons
router.get('/all', couponController.getAllCoupons);

// Route to get a single coupon by ID
router.get('/:id', couponController.getCouponById);

// Route to update a coupon by ID
router.patch('/update/:id', couponController.updateCoupon);

// Route to delete a coupon by ID
router.delete('/delete/:id', couponController.deleteCoupon);

// Route to check if a coupon is valid
router.get('/:id/validity', couponController.checkCouponValidity);

// Route to increment coupon usage
router.patch('/:id/increment', couponController.incrementCouponUsage);

// Route to get all coupons by userId
router.get('/user/:userId', couponController.getCouponsByUserId);

// Bulk upsert
router.post('/bulk', couponController.bulkUpsert);

// Get trending coupons
router.get('/trending', couponController.getTrendingCoupons);

module.exports = router;
