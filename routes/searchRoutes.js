/**
 * Search Routes
 * Handles search-related endpoints
 */

const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// GET /api/v1/search/suggestions?q={query}&limit=8
router.get('/suggestions', searchController.getSearchSuggestions);

// GET /api/v1/search/trending?limit=6
router.get('/trending', searchController.getTrendingSearches);

module.exports = router;


