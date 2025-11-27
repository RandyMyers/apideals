const express = require('express');
const router = express.Router();
const subscriptionPlanController = require('../controllers/subscriptionPlanController');

// 1. Create a New Subscription Plan
router.post('/create', subscriptionPlanController.createSubscriptionPlan);

// 2. Get All Subscription Plans
router.get('/all', subscriptionPlanController.getAllSubscriptionPlans);

// 3. Get Active Subscription Plans (must come before /get/:id)
router.get('/active', subscriptionPlanController.getActiveSubscriptionPlans);

// 4. Get a Single Subscription Plan by ID
router.get('/get/:id', subscriptionPlanController.getSubscriptionPlanById);

// 5. Update a Subscription Plan
router.patch('/update/:id', subscriptionPlanController.updateSubscriptionPlan);

// 6. Delete a Subscription Plan
router.delete('/delete/:id', subscriptionPlanController.deleteSubscriptionPlan);

// 7. Toggle Subscription Plan Status
router.patch('/toggle-status/:id', subscriptionPlanController.toggleSubscriptionPlanStatus);

module.exports = router;
