const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');
const authMiddleware = require('../middleware/authMiddleware');

// Create or update a vote (requires authentication)
router.post('/', authMiddleware, voteController.createOrUpdateVote);

// Get user's votes (requires authentication) - MUST come before /:entityType/:entityId
router.get('/user/:userId', authMiddleware, voteController.getUserVotes);

// Get vote counts for a coupon or deal (public) - MUST come after /user/:userId
router.get('/:entityType/:entityId', voteController.getVoteCounts);

module.exports = router;

