const cron = require('node-cron');
const campaignController = require('../controllers/campaignController');

// Update campaign priorities every hour
// This recalculates priority scores and manages campaign status
const updatePrioritiesJob = cron.schedule('0 * * * *', async () => {
  try {
    console.log('[Campaign Job] Starting priority update...');
    const result = await campaignController.updateCampaignPriorities();
    console.log('[Campaign Job] Priority update completed:', result);
  } catch (error) {
    console.error('[Campaign Job] Error updating priorities:', error);
  }
});

// Check for campaigns that need activation (every 15 minutes)
// Activates draft campaigns when start date arrives (only if wallet balance sufficient)
const activateCampaignsJob = cron.schedule('*/15 * * * *', async () => {
  try {
    const Campaign = require('../models/campaign');
    const Wallet = require('../models/wallet');
    const walletController = require('../controllers/walletController');
    const now = new Date();
    
    const draftCampaigns = await Campaign.find({
      status: 'draft',
      startDate: { $lte: now },
      endDate: { $gte: now }
    });

    let activated = 0;
    let skipped = 0;
    for (const campaign of draftCampaigns) {
      try {
        // Check wallet balance
        const wallet = await Wallet.getOrCreateWallet(campaign.userId);
        const availableBalance = wallet.getAvailableBalance();
        
        if (availableBalance < campaign.totalBudget) {
          console.log(`[Campaign Job] Skipping campaign ${campaign._id} - insufficient balance`);
          skipped++;
          continue;
        }

        // Reserve balance
        await walletController.reserveBalance(campaign.userId, campaign.totalBudget);
        campaign.reservedBudget = campaign.totalBudget;
        campaign.status = 'active';
        
        // Calculate initial priority score with enhanced algorithm
        const performanceScore = Math.min(
          (campaign.metrics.ctr * 50) + (campaign.metrics.conversions * 10),
          100
        );
        const budgetHealth = 100; // Full budget available
        campaign.priorityScore = (campaign.bidAmount * 0.5) + (performanceScore * 0.3) + (budgetHealth * 0.2);
        
        await campaign.save();
        activated++;
      } catch (error) {
        console.error(`[Campaign Job] Error activating campaign ${campaign._id}:`, error.message);
      }
    }

    if (activated > 0) {
      console.log(`[Campaign Job] Activated ${activated} campaigns`);
    }
    if (skipped > 0) {
      console.log(`[Campaign Job] Skipped ${skipped} campaigns (insufficient balance)`);
    }
  } catch (error) {
    console.error('[Campaign Job] Error activating campaigns:', error);
  }
});

// Check daily budget limits and wallet balance (every hour)
// Pauses campaigns that exceed daily budget or have insufficient wallet balance
const checkDailyBudgetsJob = cron.schedule('0 * * * *', async () => {
  try {
    const Campaign = require('../models/campaign');
    const CampaignSpend = require('../models/campaignSpend');
    const Wallet = require('../models/wallet');
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));

    const activeCampaigns = await Campaign.find({
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now }
    });

    let paused = 0;
    for (const campaign of activeCampaigns) {
      try {
        // Check wallet balance
        const wallet = await Wallet.getOrCreateWallet(campaign.userId);
        const availableBalance = wallet.getAvailableBalance();
        
        // Check if remaining budget exceeds available balance
        const remainingBudget = campaign.totalBudget - campaign.currentSpend;
        if (remainingBudget > 0 && availableBalance < 1) {
          campaign.status = 'paused';
          await campaign.save();
          paused++;
          console.log(`[Campaign Job] Paused campaign ${campaign._id} - insufficient wallet balance`);
          continue;
        }

        // Calculate today's spend
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

        const spend = todaySpend.length > 0 ? todaySpend[0].totalSpend : 0;

        if (spend >= campaign.dailyBudget) {
          campaign.status = 'paused';
          await campaign.save();
          paused++;
          console.log(`[Campaign Job] Paused campaign ${campaign._id} - exceeded daily budget`);
        }

        // Check if total budget exhausted
        if (campaign.currentSpend >= campaign.totalBudget) {
          campaign.status = 'expired';
          await campaign.save();
          paused++;
          console.log(`[Campaign Job] Expired campaign ${campaign._id} - total budget exhausted`);
        }
      } catch (err) {
        console.error(`[Campaign Job] Error checking campaign ${campaign._id}:`, err.message);
      }
    }

    if (paused > 0) {
      console.log(`[Campaign Job] Paused/expired ${paused} campaigns`);
    }
  } catch (error) {
    console.error('[Campaign Job] Error checking daily budgets:', error);
  }
});

// Reset daily budgets at midnight and resume paused campaigns
const resetDailyBudgetsJob = cron.schedule('0 0 * * *', async () => {
  try {
    const Campaign = require('../models/campaign');
    const Wallet = require('../models/wallet');
    const now = new Date();
    
    // Find paused campaigns that should be resumed (have remaining budget)
    const pausedCampaigns = await Campaign.find({
      status: 'paused',
      startDate: { $lte: now },
      endDate: { $gte: now }
    });

    let resumed = 0;
    for (const campaign of pausedCampaigns) {
      try {
        // Check if campaign has remaining budget
        const remainingBudget = campaign.totalBudget - campaign.currentSpend;
        if (remainingBudget <= 0) {
          campaign.status = 'expired';
          await campaign.save();
          continue;
        }

        // Check wallet balance
        const wallet = await Wallet.getOrCreateWallet(campaign.userId);
        const availableBalance = wallet.getAvailableBalance();
        
        // Resume if wallet has sufficient balance for at least $1
        if (availableBalance >= 1) {
          campaign.status = 'active';
          await campaign.save();
          resumed++;
          console.log(`[Campaign Job] Resumed campaign ${campaign._id} at midnight`);
        }
      } catch (error) {
        console.error(`[Campaign Job] Error resuming campaign ${campaign._id}:`, error.message);
      }
    }

    if (resumed > 0) {
      console.log(`[Campaign Job] Resumed ${resumed} campaigns at midnight`);
    }
  } catch (error) {
    console.error('[Campaign Job] Error resetting daily budgets:', error);
  }
});

// Initialize jobs (call this from app.js)
const startCampaignJobs = () => {
  updatePrioritiesJob.start();
  activateCampaignsJob.start();
  checkDailyBudgetsJob.start();
  resetDailyBudgetsJob.start();
  console.log('[Campaign Jobs] All campaign jobs started');
};

// Stop jobs (for graceful shutdown)
const stopCampaignJobs = () => {
  updatePrioritiesJob.stop();
  activateCampaignsJob.stop();
  checkDailyBudgetsJob.stop();
  resetDailyBudgetsJob.stop();
  console.log('[Campaign Jobs] All campaign jobs stopped');
};

module.exports = {
  startCampaignJobs,
  stopCampaignJobs,
  updatePrioritiesJob,
  activateCampaignsJob,
  checkDailyBudgetsJob,
  resetDailyBudgetsJob
};

