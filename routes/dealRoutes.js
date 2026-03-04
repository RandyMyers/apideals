const express = require('express');
const router = express.Router();
const dealController = require('../controllers/dealsController');
const authOrApiKeyOptionalMiddleware = require('../middleware/authOrApiKeyOptionalMiddleware');

// Create a new deal (userId from body, or from API key/JWT when provided)
router.post('/create', authOrApiKeyOptionalMiddleware, dealController.createDeal);

// Get all deals
router.get('/all', dealController.getAllDeals);

// Get a single deal by ID
router.get('/get/:id', dealController.getDealById);

router.get('/user/:userId', dealController.getDealsByUserId);

// Update a deal by ID
router.patch('/update/:id', dealController.updateDeal);

// Delete a deal by ID
router.delete('/delete/:id', dealController.deleteDeal);

// Check if a deal is valid
router.get('/validity/:id', dealController.checkDealValidity);

// Increment the usage count of a deal
router.post('/increment/:id', dealController.incrementDealUsage);

// Bulk upsert deals
router.post('/bulk', dealController.bulkUpsert);

module.exports = router;
