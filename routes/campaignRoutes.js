const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const authMiddleware = require('../middleware/authMiddleware');

// Create campaign (authenticated)
router.post('/create', authMiddleware, campaignController.createCampaign);

// Get active campaigns (public - for displaying sponsored items)
router.get('/active', campaignController.getActiveCampaigns);

// Get my campaigns (authenticated)
router.get('/me', authMiddleware, campaignController.getMyCampaigns);

// Activate campaign (reserve balance and start)
router.post('/:id/activate', authMiddleware, campaignController.activateCampaign);

// Initialize campaign payment (deprecated - use activate endpoint)
router.post('/payment/initialize', authMiddleware, campaignController.initializeCampaignPayment);

// Get campaign by ID (authenticated)
router.get('/:id', authMiddleware, campaignController.getCampaignById);

// Update campaign (authenticated, owner only)
router.patch('/:id', authMiddleware, campaignController.updateCampaign);

// Delete/cancel campaign
router.delete('/:id', authMiddleware, campaignController.deleteCampaign);

// Get campaign analytics
router.get('/:id/analytics', authMiddleware, campaignController.getCampaignAnalytics);

// Track interaction (public endpoint for tracking)
router.post('/:id/track', campaignController.trackCampaignInteraction);

module.exports = router;

