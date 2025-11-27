const express = require('express');
const router = express.Router();

const discountController = require('../controllers/discountController');

// 1. Create a New Discount
router.post('/create', discountController.createDiscount);

// 2. Get All Discounts
router.get('/all', discountController.getAllDiscounts);

// 3. Get a Single Discount by ID
router.get('/get/:id', discountController.getDiscountById);

// 4. Update a Discount
router.patch('/update/:id', discountController.updateDiscount);

// 5. Delete a Discount
router.delete('/delete/:id', discountController.deleteDiscount);

// 6. Get Active Discounts
router.get('/active', discountController.getActiveDiscounts);

// 7. Validate a Discount Code
router.post('/validate', discountController.validateDiscountCode);

// 8. Toggle Discount Status
router.patch('/:id/status', discountController.toggleDiscountStatus);

module.exports = router;
