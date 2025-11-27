const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const walletController = require('../controllers/walletController');

// Get wallet balance
router.get('/balance', authMiddleware, walletController.getBalance);

// Initialize payment (unified endpoint - handles all payment gateways)
router.post('/initialize-payment', authMiddleware, walletController.initializePayment);

// Legacy endpoint (for backward compatibility - redirects to initializePayment)
router.post('/add-funds', authMiddleware, walletController.initializePayment);

// Complete payment (internal - called by gateway webhooks, no auth required for webhook)
router.post('/complete-payment', walletController.completePayment);

// Get transaction history
router.get('/transactions', authMiddleware, walletController.getTransactions);

module.exports = router;

