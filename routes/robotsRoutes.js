/**
 * Robots.txt Routes
 * Routes for robots.txt generation
 */

const express = require('express');
const router = express.Router();
const robotsController = require('../controllers/robotsController');

// Robots.txt
router.get('/robots.txt', robotsController.getRobotsTxt);

module.exports = router;

