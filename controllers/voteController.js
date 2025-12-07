const Vote = require('../models/vote');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const CouponUsage = require('../models/couponUsage');

// Create or update a vote
exports.createOrUpdateVote = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId || req.body.userId;
    const { couponId, dealId, type } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User authentication required.' });
    }

    if (!couponId && !dealId) {
      return res.status(400).json({ message: 'Either couponId or dealId must be provided.' });
    }

    if (type !== 'up' && type !== 'down') {
      return res.status(400).json({ message: 'Vote type must be "up" or "down".' });
    }

    // Verify that coupon or deal exists and get entity data
    let entity = null;
    let storeId = null;
    
    if (couponId) {
      entity = await Coupon.findById(couponId);
      if (!entity) {
        return res.status(404).json({ message: 'Coupon not found.' });
      }
      storeId = entity.storeId || entity.store;
    }

    if (dealId) {
      entity = await Deal.findById(dealId);
      if (!entity) {
        return res.status(404).json({ message: 'Deal not found.' });
      }
      storeId = entity.storeId || entity.store;
    }
    
    if (!storeId) {
      return res.status(400).json({ message: 'Store not found for this coupon/deal.' });
    }

    // Find existing vote
    const query = couponId 
      ? { userId, couponId }
      : { userId, dealId };

    const existingVote = await Vote.findOne(query);

    let vote;
    let shouldTrackSavings = false;
    let shouldRemoveSavings = false;
    
    if (existingVote) {
      // Update existing vote
      if (existingVote.type === type) {
        // Same vote type, remove it (toggle off)
        await Vote.findByIdAndDelete(existingVote._id);
        vote = null;
        // If it was a thumbs up, remove the savings tracking
        if (existingVote.type === 'up') {
          shouldRemoveSavings = true;
        }
      } else {
        // Different vote type, update it
        const wasThumbsUp = existingVote.type === 'up';
        const isNowThumbsUp = type === 'up';
        
        existingVote.type = type;
        existingVote.updatedAt = Date.now();
        vote = await existingVote.save();
        
        // If changing from down to up, track savings
        if (!wasThumbsUp && isNowThumbsUp) {
          shouldTrackSavings = true;
        }
        // If changing from up to down, remove savings
        if (wasThumbsUp && !isNowThumbsUp) {
          shouldRemoveSavings = true;
        }
      }
    } else {
      // Create new vote
      vote = new Vote({
        userId,
        couponId,
        dealId,
        type,
      });
      await vote.save();
      
      // If it's a thumbs up, track savings
      if (type === 'up') {
        shouldTrackSavings = true;
      }
    }
    
    // Track or remove savings based on vote
    if (shouldTrackSavings && entity) {
      // Check if usage already exists
      const usageQuery = couponId 
        ? { userId, entityId: couponId, entityType: 'coupon' }
        : { userId, entityId: dealId, entityType: 'deal' };
      
      const existingUsage = await CouponUsage.findOne(usageQuery);
      
      if (!existingUsage) {
        // Create new usage record
        const usage = new CouponUsage({
          userId,
          entityType: couponId ? 'coupon' : 'deal',
          entityId: couponId || dealId,
          entityModel: couponId ? 'Coupon' : 'Deal',
          storeId,
          discountType: entity.discountType,
          discountValue: entity.discountValue,
          purchaseAmount: entity.originalPrice || entity.savingsAmount || 0, // Use original price if available, otherwise estimate
          worked: true, // User confirmed it worked by voting thumbs up
        });
        await usage.save();
      }
    } else if (shouldRemoveSavings) {
      // Remove usage record when user removes thumbs up or changes to thumbs down
      const usageQuery = couponId 
        ? { userId, entityId: couponId, entityType: 'coupon' }
        : { userId, entityId: dealId, entityType: 'deal' };
      
      await CouponUsage.deleteMany(usageQuery);
    }

    // Get updated vote counts
    const voteCounts = await getVoteCounts(couponId, dealId);

    res.status(200).json({
      message: vote ? 'Vote saved successfully.' : 'Vote removed successfully.',
      vote: vote,
      voteCounts: {
        thumbsUp: voteCounts.thumbsUp,
        thumbsDown: voteCounts.thumbsDown,
        total: voteCounts.total,
        successRate: voteCounts.successRate,
      },
    });
  } catch (error) {
    console.error('Error creating/updating vote:', error);
    if (error.code === 11000) {
      // Duplicate vote - this shouldn't happen with our logic, but handle gracefully
      // Try to find the existing vote and return it
      const query = couponId 
        ? { userId, couponId }
        : { userId, dealId };
      const existingVote = await Vote.findOne(query);
      
      if (existingVote) {
        // Return the existing vote as if it was successful
        const voteCounts = await getVoteCounts(couponId, dealId);
        return res.status(200).json({
          message: 'Vote already exists.',
          vote: existingVote,
          voteCounts: {
            thumbsUp: voteCounts.thumbsUp,
            thumbsDown: voteCounts.thumbsDown,
            total: voteCounts.total,
            successRate: voteCounts.successRate,
          },
        });
      }
      return res.status(409).json({ message: 'Vote already exists.' });
    }
    res.status(500).json({
      message: 'Error creating/updating vote.',
      error: error.message,
    });
  }
};

// Get vote counts for a coupon or deal
exports.getVoteCounts = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    if (entityType !== 'coupon' && entityType !== 'deal') {
      return res.status(400).json({ message: 'Entity type must be "coupon" or "deal".' });
    }

    const couponId = entityType === 'coupon' ? entityId : null;
    const dealId = entityType === 'deal' ? entityId : null;

    const voteCounts = await getVoteCounts(couponId, dealId);

    // Get user's vote if authenticated
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    let userVote = null;
    if (userId) {
      const query = couponId 
        ? { userId, couponId }
        : { userId, dealId };
      const vote = await Vote.findOne(query);
      if (vote) {
        userVote = vote.type;
      }
    }

    res.status(200).json({
      thumbsUp: voteCounts.thumbsUp,
      thumbsDown: voteCounts.thumbsDown,
      total: voteCounts.total,
      successRate: voteCounts.successRate,
      userVote,
    });
  } catch (error) {
    console.error('Error fetching vote counts:', error);
    res.status(500).json({
      message: 'Error fetching vote counts.',
      error: error.message,
    });
  }
};

// Get user's votes
exports.getUserVotes = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId || req.params.userId;

    if (!userId) {
      return res.status(401).json({ message: 'User authentication required.' });
    }

    const votes = await Vote.find({ userId })
      .populate('couponId', 'title code')
      .populate('dealId', 'name title')
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      votes,
      count: votes.length,
    });
  } catch (error) {
    console.error('Error fetching user votes:', error);
    res.status(500).json({
      message: 'Error fetching user votes.',
      error: error.message,
    });
  }
};

// Helper function to get vote counts
async function getVoteCounts(couponId, dealId) {
  const query = couponId ? { couponId } : { dealId };

  const [upVotes, downVotes] = await Promise.all([
    Vote.countDocuments({ ...query, type: 'up' }),
    Vote.countDocuments({ ...query, type: 'down' }),
  ]);

  const total = upVotes + downVotes;
  const successRate = total > 0 ? Math.round((upVotes / total) * 100) : 0;

  return {
    thumbsUp: upVotes,
    thumbsDown: downVotes,
    total,
    successRate,
  };
}

