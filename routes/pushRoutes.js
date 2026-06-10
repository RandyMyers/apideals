const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const pushController = require('../controllers/pushController');

const router = express.Router();

router.get('/vapid-public-key', pushController.getVapidPublicKey);
router.post('/subscribe', authMiddleware, pushController.subscribe);
router.post('/unsubscribe', authMiddleware, pushController.unsubscribe);

module.exports = router;
