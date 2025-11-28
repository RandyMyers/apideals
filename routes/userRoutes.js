const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware'); // Import authMiddleware
const adminMiddleware = require('../middleware/adminMiddleware'); // Import adminMiddleware
// const { validateCredits } = require('../middleware/creditMiddleware');
const router = express.Router();

// Apply authMiddleware and adminMiddleware to protect the routes

// Route to create a user (admin only)
router.post('/create', authMiddleware, adminMiddleware(['superAdmin']), userController.createUser);

// Route to get user statistics (authenticated users)
router.get('/:userId/stats', authMiddleware, userController.getUserStats);

// Route to get user by ID (authenticated users)
router.get('/get/:id', authMiddleware, userController.getUserById);

// Route to get all users (admin only)
router.get('/find/all', authMiddleware, adminMiddleware(['superAdmin']), userController.getAllUsers);

// Route to update a user (authenticated users)
router.patch('/update/:id', authMiddleware, userController.updateUser);

// Route to delete a user (admin only)
router.delete('/delete/:id', authMiddleware, adminMiddleware(['superAdmin']), userController.deleteUser);
 
// Route to reactivate a user (admin only)
router.patch('/reactivate/:id', authMiddleware, adminMiddleware(['superAdmin']), userController.reactivateUser);

// Route to get referred users (authenticated users)
router.get('/referred/:id', authMiddleware, userController.getReferredUsers);

// Route to add credits to a user (authenticated users)
router.post('/add-credits/:id', authMiddleware, adminMiddleware(['superAdmin', 'couponManager']), userController.addCredits);

// Route to update user password (admin only)
router.patch('/admin/update-password/:id', authMiddleware, adminMiddleware(['superAdmin']), userController.adminUpdateUserPassword);

router.post('/follow/coupon', userController.followCoupon);
router.post('/unfollow/coupon', userController.unfollowCoupon);
router.post('/follow/deal', userController.followDeal);
router.post('/unfollow/deal', userController.unfollowDeal);
router.get('/followed/coupons/:userId', userController.getFollowedCoupons);
router.get('/followed/deals/:userId', userController.getFollowedDeals);

// Get user's store subscriptions
router.get('/:userId/store-subscriptions', authMiddleware, userController.getUserStoreSubscriptions);

// Get all users' activities (Admin only) - Must be before /:userId/activity to avoid route conflict
router.get('/admin/activities', authMiddleware, adminMiddleware(['superAdmin']), userController.getAllUsersActivities);

// Get user's activity log
router.get('/:userId/activity', authMiddleware, userController.getUserActivity);

module.exports = router;
