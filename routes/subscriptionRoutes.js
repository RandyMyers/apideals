const express = require('express');
const router = express.Router();
const SubscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/authMiddleware');

// Route to create a new subscription
router.post('/create', SubscriptionController.createSubscription);

// Route to fetch all subscriptions
router.get('/all', SubscriptionController.getAllSubscriptions);

// Route to fetch a subscription by ID
router.get('/get/:id', SubscriptionController.getSubscriptionById);

// Route to fetch subscriptions by user ID
router.get('/user/:userId', SubscriptionController.getSubscriptionsByUserId);

// Get current user's subscriptions (authenticated)
router.get('/me', authMiddleware, SubscriptionController.getMySubscriptions);

// Get subscription usage stats (authenticated) - must come before /get/:id
router.get('/:subscriptionId/usage', authMiddleware, SubscriptionController.getSubscriptionUsage);

// Route to update a subscription
router.patch('/update/:id', SubscriptionController.updateSubscription);

// Route to change a subscription plan
router.patch('/upgrade/:id', SubscriptionController.changeSubscription);

// Route to update a subscription
router.patch('/renew/:id', SubscriptionController.renewSubscription);

// Route to delete a subscription
router.delete('/delete/:id', SubscriptionController.deleteSubscription);

// Route to mark a subscription as expired
router.patch('/expire/:id', SubscriptionController.expireSubscription);

module.exports = router;
