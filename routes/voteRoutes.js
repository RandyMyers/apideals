const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');
const { authenticate } = require('../middleware/auth');

// Create or update a vote (requires authentication)
router.post('/', authenticate, voteController.createOrUpdateVote);

// Get user's votes (requires authentication) - MUST come before /:entityType/:entityId
router.get('/user/:userId', authenticate, voteController.getUserVotes);

// Get vote counts for a coupon or deal (public) - MUST come after /user/:userId
router.get('/:entityType/:entityId', voteController.getVoteCounts);

module.exports = router;

