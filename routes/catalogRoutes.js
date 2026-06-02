/**
 * Agent Catalog Routes
 * Public, read-only machine-readable offer feed for AI agents.
 */

const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');

router.get('/catalog.json', catalogController.getCatalog);

module.exports = router;
