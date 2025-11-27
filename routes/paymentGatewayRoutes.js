const express = require('express');
const router = express.Router();
const paymentGatewayController = require('../controllers/paymentGatewayController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public route - get active payment gateways
router.get('/active', paymentGatewayController.getActiveGateways);

// Admin routes
router.get('/', authMiddleware, adminMiddleware, paymentGatewayController.getAllGateways);
router.post('/', authMiddleware, adminMiddleware, paymentGatewayController.createOrUpdateGateway);
router.patch('/:gatewayName/status', authMiddleware, adminMiddleware, paymentGatewayController.updateGatewayStatus);

module.exports = router;


