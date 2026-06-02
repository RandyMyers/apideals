/**
 * llms.txt Routes
 */

const express = require('express');
const router = express.Router();
const llmsController = require('../controllers/llmsController');

router.get('/llms.txt', llmsController.getLlmsTxt);
// Optional verbose variant — same content for now
router.get('/llms-full.txt', llmsController.getLlmsTxt);

module.exports = router;
