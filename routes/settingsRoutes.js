const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public endpoint - get public settings (no auth required)
router.get('/public', settingsController.getPublicSettings);

// Admin-only endpoints
router.get('/all', authMiddleware, adminMiddleware, settingsController.getAllSettings);
router.get('/:key', authMiddleware, adminMiddleware, settingsController.getSetting);
router.post('/create', authMiddleware, adminMiddleware, settingsController.createSetting);
router.patch('/:key', authMiddleware, adminMiddleware, settingsController.updateSetting);

module.exports = router;

