const Campaign = require('../models/campaign');
const Store = require('../models/store');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const Payment = require('../models/payments');
const campaignSlots = require('../config/campaignSlots');
const walletController = require('./walletController');
const CampaignSpend = require('../models/campaignSpend');
const { logger } = require('../utils/logger');
const { isCountryAvailable } = require('../utils/countryUtils');

// Create new campaign
exports.createCampaign = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const {
      campaignType,
      targetId,
      name,
      description,
      totalBudget,
      dailyBudget,
      bidAmount,
      biddingType = 'CPC', // Default to CPC
      startDate,
      endDate,
      settings
    } = req.body;

    // Validate campaign type
    if (!['store', 'coupon', 'deal'].includes(campaignType)) {
      return res.status(400).json({ message: 'Invalid campaign type' });
    }

    // Validate minimum bid
    const minBid = campaignSlots.minimumBids[campaignType];
    if (bidAmount < minBid) {
      return res.status(400).json({ 
        message: `Minimum bid for ${campaignType} campaigns is $${minBid}/day` 
      });
    }

    // Validate target exists and belongs to user
    let target;
    if (campaignType === 'store') {
      target = await Store.findById(targetId);
      if (!target || target.userId.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Store not found or not owned by user' });
      }
    } else if (campaignType === 'coupon') {
      target = await Coupon.findById(targetId);
      if (!target || target.userId.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Coupon not found or not owned by user' });
      }
    } else if (campaignType === 'deal') {
      target = await Deal.findById(targetId);
      if (!target || target.userId.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Deal not found or not owned by user' });
      }
    }

    // Check available slots for active campaigns
    const activeCount = await Campaign.countDocuments({ 
      campaignType, 
      status: 'active' 
    });
    const maxActive = campaignSlots[campaignType].totalActive;
    
    if (activeCount >= maxActive) {
      return res.status(400).json({ 
        message: `Maximum ${maxActive} active ${campaignType} campaigns allowed. Please wait for slots to become available.` 
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Validate budget
    if (totalBudget < 5) {
      return res.status(400).json({ message: 'Total budget must be at least $5' });
    }
    if (dailyBudget < 5) {
      return res.status(400).json({ message: 'Daily budget must be at least $5' });
    }
    if (dailyBudget > totalBudget) {
      return res.status(400).json({ message: 'Daily budget cannot exceed total budget' });
    }

    // Validate bidding type
    if (!['CPC', 'CPM', 'CPA'].includes(biddingType)) {
      return res.status(400).json({ message: 'Invalid bidding type. Must be CPC, CPM, or CPA' });
    }

    // Check wallet balance before creating campaign
    try {
      const Wallet = require('../models/wallet');
      const wallet = await Wallet.getOrCreateWallet(userId);
      const availableBalance = wallet.getAvailableBalance();
      
      if (availableBalance < totalBudget) {
        return res.status(400).json({ 
          message: `Insufficient balance. You need $${totalBudget} but only have $${availableBalance.toFixed(2)} available. Please add funds to your wallet.`,
          availableBalance: availableBalance,
          requiredBalance: totalBudget
        });
      }
    } catch (walletError) {
      logger.error('Wallet check error', { error: walletError.message, userId });
      return res.status(500).json({ message: 'Failed to check wallet balance' });
    }

    // Process location targeting from settings
    const targetCountries = settings?.targetCountries || ['WORLDWIDE'];
    const isWorldwide = settings?.isWorldwide !== undefined ? settings.isWorldwide : (targetCountries.includes('WORLDWIDE') || targetCountries.length === 0);

    // Create campaign
    const campaign = new Campaign({
      userId,
      campaignType,
      targetId,
      name,
      description,
      totalBudget,
      dailyBudget,
      bidAmount,
      biddingType,
      startDate: start,
      endDate: end,
      status: 'draft', // Will be activated on start date
      settings: {
        ...settings,
        targetCountries,
        isWorldwide,
        placement: settings?.placement || 'all'
      }
    });

    await campaign.save();

    // Populate target for response
    await campaign.populate('targetId');
    await campaign.populate('userId', 'name email');

    res.status(201).json({
      message: 'Campaign created successfully',
      campaign
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get active campaigns (for displaying sponsored items)
exports.getActiveCampaigns = async (req, res) => {
  try {
    const { type, limit, placement, country } = req.query; // country for location filtering
    const now = new Date();
    const query = { 
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now }
    };
    
    // Filter out campaigns over budget (using MongoDB comparison)
    // We'll filter this in application logic for now

    if (type) {
      query.campaignType = type;
    }

    if (placement && placement !== 'all') {
      query['settings.placement'] = { $in: [placement, 'all'] };
    }

    // Build populate query based on type
    let campaigns = await Campaign.find(query)
      .populate('userId', 'name email')
      .sort({ priorityScore: -1 })
      .lean();
    
    // Populate targetId separately based on type
    if (type === 'store') {
      await Campaign.populate(campaigns, { path: 'targetId', model: 'Store' });
    } else if (type === 'coupon') {
      await Campaign.populate(campaigns, { path: 'targetId', model: 'Coupon' });
    } else if (type === 'deal') {
      await Campaign.populate(campaigns, { path: 'targetId', model: 'Deal' });
    } else {
      // Try to populate all types
      await Campaign.populate(campaigns, { path: 'targetId' });
    }

    // Filter out campaigns over total budget
    campaigns = campaigns.filter(c => c.currentSpend < c.totalBudget);

    // Filter by location if country is provided
    if (country) {
      campaigns = campaigns.filter(campaign => {
        const targetCountries = campaign.settings?.targetCountries || ['WORLDWIDE'];
        const isWorldwide = campaign.settings?.isWorldwide !== undefined 
          ? campaign.settings.isWorldwide 
          : (targetCountries.includes('WORLDWIDE') || targetCountries.length === 0);
        
        return isCountryAvailable(country, targetCountries, isWorldwide);
      });
    }

    // Limit by slots
    const slotLimit = type ? (campaignSlots[type][placement || 'homepage'] || campaignSlots[type].homepage) : 100;
    campaigns = campaigns.slice(0, parseInt(limit) || slotLimit);

    res.status(200).json({ campaigns });
  } catch (error) {
    console.error('Error fetching active campaigns:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get user's campaigns
exports.getMyCampaigns = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { status } = req.query;
    const query = { userId };
    
    if (status) {
      query.status = status;
    }

    const campaigns = await Campaign.find(query)
      .populate('targetId')
      .sort({ createdAt: -1 });

    res.status(200).json({ campaigns });
  } catch (error) {
    console.error('Error fetching user campaigns:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get campaign by ID
exports.getCampaignById = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const campaign = await Campaign.findById(id)
      .populate('targetId')
      .populate('userId', 'name email')
      .populate('paymentId');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check ownership
    if (campaign.userId._id.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.status(200).json({ campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update campaign
exports.updateCampaign = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const updates = req.body;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check ownership
    if (campaign.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Validate minimum bid if updating bidAmount
    if (updates.bidAmount) {
      const minBid = campaignSlots.minimumBids[campaign.campaignType];
      if (updates.bidAmount < minBid) {
        return res.status(400).json({ 
          message: `Minimum bid for ${campaign.campaignType} campaigns is $${minBid}/day` 
        });
      }
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'totalBudget', 'dailyBudget', 'bidAmount', 'status', 'startDate', 'endDate', 'settings'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        campaign[field] = updates[field];
      }
    });

    // Recalculate priority if active
    if (campaign.status === 'active') {
      const performanceScore = Math.min(
        (campaign.metrics.ctr * 50) + (campaign.metrics.conversions * 10),
        100
      );
      campaign.priorityScore = (campaign.bidAmount * 0.7) + (performanceScore * 0.3);
    }

    await campaign.save();

    res.status(200).json({
      message: 'Campaign updated successfully',
      campaign
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete/cancel campaign (refund unused budget)
exports.deleteCampaign = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check ownership
    if (campaign.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Calculate unused budget to refund
    const remainingBudget = campaign.totalBudget - campaign.currentSpend;
    const unusedBudget = Math.max(0, remainingBudget);

    // If campaign was active and had reserved budget, refund it
    if ((campaign.status === 'active' || campaign.status === 'paused') && campaign.reservedBudget > 0) {
      try {
        // Release reserved balance and refund unused amount
        await walletController.refundToWallet(
          userId,
          unusedBudget,
          campaign._id,
          `Refund for cancelled campaign: ${campaign.name}`
        );
        
        logger.info('Campaign cancelled and refunded', {
          campaignId: campaign._id,
          userId,
          refundAmount: unusedBudget,
          totalBudget: campaign.totalBudget,
          spent: campaign.currentSpend
        });
      } catch (refundError) {
        logger.error('Failed to refund campaign', {
          error: refundError.message,
          campaignId: campaign._id,
          userId
        });
        // Continue with cancellation even if refund fails
      }
    }

    // Cancel campaign (don't delete to maintain history)
    campaign.status = 'cancelled';
    await campaign.save();

    res.status(200).json({ 
      message: 'Campaign cancelled successfully',
      refundAmount: unusedBudget,
      spent: campaign.currentSpend
    });
  } catch (error) {
    logger.error('Error deleting campaign', { error: error.message, userId: req.user?.id });
    res.status(500).json({ message: error.message });
  }
};

// Get campaign analytics
exports.getCampaignAnalytics = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const campaign = await Campaign.findById(id)
      .populate('targetId');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check ownership
    if (campaign.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Calculate additional metrics
    const remainingBudget = campaign.totalBudget - campaign.currentSpend;
    const daysRemaining = Math.ceil((campaign.endDate - new Date()) / (1000 * 60 * 60 * 24));
    const avgDailySpend = campaign.currentSpend / Math.max(
      Math.ceil((new Date() - campaign.startDate) / (1000 * 60 * 60 * 24)),
      1
    );

    res.status(200).json({
      campaign,
      analytics: {
        remainingBudget,
        daysRemaining,
        avgDailySpend,
        budgetUtilization: (campaign.currentSpend / campaign.totalBudget) * 100,
        estimatedDaysRemaining: remainingBudget / avgDailySpend || 0
      }
    });
  } catch (error) {
    console.error('Error fetching campaign analytics:', error);
    res.status(500).json({ message: error.message });
  }
};

// Track campaign interaction (view/click)
// Track campaign interaction (view/click) with real-time spending deduction
exports.trackCampaignInteraction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'view' or 'click'

    const campaign = await Campaign.findById(id);
    if (!campaign || campaign.status !== 'active') {
      return res.status(404).json({ message: 'Campaign not found or not active' });
    }

    // Check budget limits
    const remainingBudget = campaign.totalBudget - campaign.currentSpend;
    if (remainingBudget <= 0) {
      campaign.status = 'expired';
      await campaign.save();
      return res.status(400).json({ message: 'Campaign budget exhausted' });
    }

    // Check daily budget
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todaySpend = await CampaignSpend.aggregate([
      {
        $match: {
          campaignId: campaign._id,
          date: { $gte: todayStart }
        }
      },
      {
        $group: {
          _id: null,
          totalSpend: { $sum: '$spend' }
        }
      }
    ]);
    const todayTotal = todaySpend.length > 0 ? todaySpend[0].totalSpend : 0;
    
    if (todayTotal >= campaign.dailyBudget) {
      // Pause campaign if daily budget exceeded
      campaign.status = 'paused';
      await campaign.save();
      return res.status(400).json({ message: 'Daily budget exceeded' });
    }

    // Increment metrics
    let spendAmount = 0;
    if (type === 'view') {
      campaign.metrics.views += 1;
      // For CPM, calculate spend (per 1000 impressions)
      if (campaign.biddingType === 'CPM') {
        // Calculate cost for this view (1/1000th of CPM bid)
        spendAmount = campaign.bidAmount / 1000;
      }
    } else if (type === 'click') {
      campaign.metrics.clicks += 1;
      
      // Calculate actual cost (second-price auction logic)
      // For now, use bid amount, but in production you'd calculate based on competing bids
      spendAmount = campaign.biddingType === 'CPC' ? campaign.bidAmount : 0;
      
      // For CPC, we only charge on clicks
      if (campaign.biddingType === 'CPC') {
        // Use second-price auction: pay slightly more than next highest bid
        // For simplicity, we'll use 80% of bid as actual cost (in production, calculate from competing campaigns)
        spendAmount = campaign.bidAmount * 0.8;
        campaign.actualCPC = spendAmount;
      }
    }

    // Deduct from wallet and campaign budget if there's a charge
    if (spendAmount > 0 && spendAmount <= remainingBudget && (todayTotal + spendAmount) <= campaign.dailyBudget) {
      try {
        // Deduct from wallet
        await walletController.spendFromWallet(
          campaign.userId,
          spendAmount,
          campaign._id,
          {
            type,
            biddingType: campaign.biddingType,
            description: `${campaign.biddingType} charge for ${type}`
          }
        );

        // Update campaign spend
        campaign.currentSpend += spendAmount;
        
        // Update daily spend tracking
        const todayKey = new Date().toISOString().split('T')[0];
        await CampaignSpend.findOneAndUpdate(
          { campaignId: campaign._id, date: todayStart },
          {
            $inc: { 
              spend: spendAmount,
              [type === 'click' ? 'clicks' : 'impressions']: 1
            }
          },
          { upsert: true, new: true }
        );

        logger.info('Campaign spend deducted', {
          campaignId: campaign._id,
          type,
          spendAmount,
          remainingBudget: remainingBudget - spendAmount
        });
      } catch (walletError) {
        logger.error('Wallet deduction failed', {
          error: walletError.message,
          campaignId: campaign._id,
          userId: campaign.userId
        });
        // Don't fail the request, but log the error
        // Campaign will be paused by cron job if balance insufficient
      }
    }

    // Recalculate CTR
    if (campaign.metrics.views > 0) {
      campaign.metrics.ctr = (campaign.metrics.clicks / campaign.metrics.views) * 100;
    }

    // Recalculate priority score with enhanced algorithm
    const performanceScore = Math.min(
      (campaign.metrics.ctr * 50) + (campaign.metrics.conversions * 10),
      100
    );
    const budgetHealth = Math.min((remainingBudget / campaign.totalBudget) * 100, 100);
    campaign.priorityScore = (campaign.bidAmount * 0.5) + (performanceScore * 0.3) + (budgetHealth * 0.2);

    // Check if budget exhausted
    if (campaign.currentSpend >= campaign.totalBudget) {
      campaign.status = 'expired';
    }

    await campaign.save();

    res.status(200).json({ 
      message: 'Interaction tracked',
      campaign: {
        id: campaign._id,
        metrics: campaign.metrics,
        currentSpend: campaign.currentSpend,
        remainingBudget: campaign.totalBudget - campaign.currentSpend
      }
    });
  } catch (error) {
    logger.error('Error tracking interaction', { error: error.message, campaignId: req.params.id });
    res.status(500).json({ message: error.message });
  }
};

// Update campaign priorities (for cron job)
exports.updateCampaignPriorities = async () => {
  try {
    console.log('Updating campaign priority scores...');
    
    const activeCampaigns = await Campaign.find({ 
      status: { $in: ['active', 'draft'] },
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    let updated = 0;
    let paused = 0;
    let expired = 0;
    let completed = 0;

    for (const campaign of activeCampaigns) {
      // Check if expired
      if (new Date() > campaign.endDate) {
        campaign.status = 'expired';
        expired++;
        await campaign.save();
        continue;
      }

      // Check if out of total budget
      if (campaign.currentSpend >= campaign.totalBudget) {
        campaign.status = 'completed';
        completed++;
        await campaign.save();
        continue;
      }

      // Recalculate priority score for active campaigns
      if (campaign.status === 'active') {
        const performanceScore = Math.min(
          (campaign.metrics.ctr * 50) + (campaign.metrics.conversions * 10),
          100
        );
        campaign.priorityScore = (campaign.bidAmount * 0.7) + (performanceScore * 0.3);
        campaign.lastPriorityUpdate = Date.now();
        updated++;

        // Activate draft campaigns that have started
        if (new Date() >= campaign.startDate && campaign.status === 'draft') {
          campaign.status = 'active';
        }
      }

      await campaign.save();
    }

    console.log(`Campaign priorities updated: ${updated} updated, ${paused} paused, ${expired} expired, ${completed} completed`);
    return { updated, paused, expired, completed };
  } catch (error) {
    console.error('Error updating campaign priorities:', error);
    throw error;
  }
};

// Initialize campaign payment
// Activate campaign (reserve balance from wallet)
exports.activateCampaign = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (campaign.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (campaign.status !== 'draft') {
      return res.status(400).json({ 
        message: `Campaign cannot be activated. Current status: ${campaign.status}` 
      });
    }

    // Check wallet balance
    const Wallet = require('../models/wallet');
    const wallet = await Wallet.getOrCreateWallet(userId);
    const availableBalance = wallet.getAvailableBalance();

    if (availableBalance < campaign.totalBudget) {
      return res.status(400).json({ 
        message: `Insufficient balance. You need $${campaign.totalBudget} but only have $${availableBalance.toFixed(2)} available.`,
        availableBalance: availableBalance,
        requiredBalance: campaign.totalBudget
      });
    }

    // Reserve balance from wallet
    try {
      await walletController.reserveBalance(userId, campaign.totalBudget);
      campaign.reservedBudget = campaign.totalBudget;
      campaign.status = 'active';
      
      // Calculate initial priority score
      const performanceScore = Math.min(
        (campaign.metrics.ctr * 50) + (campaign.metrics.conversions * 10),
        100
      );
      const budgetHealth = 100; // Full budget available
      campaign.priorityScore = (campaign.bidAmount * 0.5) + (performanceScore * 0.3) + (budgetHealth * 0.2);
      
      await campaign.save();

      logger.info('Campaign activated', {
        campaignId: campaign._id,
        userId,
        totalBudget: campaign.totalBudget
      });

      res.status(200).json({
        message: 'Campaign activated successfully',
        campaign: {
          id: campaign._id,
          status: campaign.status,
          reservedBudget: campaign.reservedBudget,
          availableBalance: availableBalance - campaign.totalBudget
        }
      });
    } catch (walletError) {
      logger.error('Failed to reserve balance', {
        error: walletError.message,
        userId,
        campaignId: campaign._id
      });
      return res.status(500).json({ 
        message: 'Failed to reserve balance',
        error: walletError.message 
      });
    }
  } catch (error) {
    logger.error('Error activating campaign', { error: error.message, userId: req.user?.id });
    res.status(500).json({ message: error.message });
  }
};

exports.initializeCampaignPayment = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { campaignId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (campaign.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // This endpoint is now deprecated - use activateCampaign instead
    // Kept for backward compatibility
    res.status(200).json({
      message: 'Use POST /campaigns/:id/activate to activate campaign',
      campaignId: campaign._id
    });
  } catch (error) {
    console.error('Error initializing campaign payment:', error);
    res.status(500).json({ message: error.message });
  }
};

