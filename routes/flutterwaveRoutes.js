const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const fw = require('../controllers/flutterwaveController');

router.post('/initialize', authMiddleware, fw.initialize);
router.post('/wallet/initialize', authMiddleware, fw.initializeWalletPayment);
router.post('/webhook', fw.webhook);

module.exports = router;


