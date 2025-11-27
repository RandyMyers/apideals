const express = require('express');
const router = express.Router();
const PaymentLinkController = require('../controllers/paymentLinkController');

// Route to create a new payment link
router.post('/create', PaymentLinkController.createPaymentLink);

// Route to get all payment links
router.get('/all', PaymentLinkController.getAllPaymentLinks);

// Route to get a single payment link by ID
router.get('/:id', PaymentLinkController.getPaymentLinkById);

// Route to update a payment link by ID
router.patch('/update/:id', PaymentLinkController.updatePaymentLink);

// Route to delete a payment link by ID
router.delete('/delete/:id', PaymentLinkController.deletePaymentLink);

module.exports = router;
