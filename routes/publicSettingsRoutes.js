const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// Public endpoint - get public settings (no auth required)
router.get('/', settingsController.getPublicSettings);

module.exports = router;

