const express = require('express');
const router = express.Router();
const DiscountUsageController = require('../controllers/discountUsageController');

// Route to record a new discount usage
router.post('/create', DiscountUsageController.recordDiscountUsage);

// Route to fetch all discount usages
router.get('/all', DiscountUsageController.getAllDiscountUsages);

// Route to fetch a specific discount usage by ID
router.get('/:id', DiscountUsageController.getDiscountUsageById);

// Route to update a discount usage
router.patch('/update/:id', DiscountUsageController.updateDiscountUsage);

// Route to delete a discount usage
router.delete('/delete/:id', DiscountUsageController.deleteDiscountUsage);

module.exports = router;
