/**
 * Stats Routes
 * Handles statistics endpoints
 */

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// GET /api/v1/stats/homepage
router.get('/homepage', statsController.getHomepageStats);

module.exports = router;


