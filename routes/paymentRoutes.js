const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

// Routes
router.post('/create', PaymentController.createPayment);
router.get('/all', PaymentController.getAllPayments);
router.get('/get/:id', PaymentController.getPaymentById);
router.patch('/update/:id', PaymentController.updatePaymentStatus);
router.delete('/delete/:id', PaymentController.deletePayment);

// Get current user's payments (authenticated)
router.get('/me', authMiddleware, PaymentController.getMyPayments);

// Initialize payment for sponsored store (STANDALONE feature)
router.post('/sponsor-store', authMiddleware, PaymentController.initializeSponsorStorePayment);

module.exports = router;
