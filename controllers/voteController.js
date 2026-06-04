const Vote = require('../models/vote');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const CouponUsage = require('../models/couponUsage');
const { buildUsageSavingsFields } = require('../utils/savingsConversion');

function isObjectIdLike(value) {
  return /^[0-9a-fA-F]{24}$/.test(String(value || '').trim());
}

async function resolveCouponId(couponIdOrSlug) {
  if (!couponIdOrSlug) return null;
  if (isObjectIdLike(couponIdOrSlug)) return String(couponIdOrSlug).trim();
  const coupon = await Coupon.findOne({ slug: String(couponIdOrSlug).trim() }).select('_id').lean();
  return coupon?._id || null;
}

async function resolveDealId(dealIdOrSlug) {
  if (!dealIdOrSlug) return null;
  if (isObjectIdLike(dealIdOrSlug)) return String(dealIdOrSlug).trim();
  const deal = await Deal.findOne({ slug: String(dealIdOrSlug).trim() }).select('_id').lean();
  return deal?._id || null;
}

// Create or update a vote
exports.createOrUpdateVote = async (req, res) => {
  let userId = null;
  let couponId = null;
  let dealId = null;
  try {
    userId = req.user?.id || req.user?._id || req.user?.userId || req.body.userId;
    const { couponId: couponIdInput, dealId: dealIdInput, type, purchaseAmount, purchaseCurrency } = req.body;
    couponId = couponIdInput;
    dealId = dealIdInput;

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
    let resolvedCouponId = null;
    let resolvedDealId = null;
    
    if (couponId) {
      resolvedCouponId = await resolveCouponId(couponId);
      entity = await Coupon.findOne(
        resolvedCouponId ? { _id: resolvedCouponId } : { slug: couponId }
      );
      if (!entity) {
        return res.status(404).json({ message: 'Coupon not found.' });
      }
      storeId = entity.storeId || entity.store;
      resolvedCouponId = entity._id;
    }

    if (dealId) {
      resolvedDealId = await resolveDealId(dealId);
      entity = await Deal.findOne(
        resolvedDealId ? { _id: resolvedDealId } : { slug: dealId }
      );
      if (!entity) {
        return res.status(404).json({ message: 'Deal not found.' });
      }
      storeId = entity.storeId || entity.store;
      resolvedDealId = entity._id;
    }
    
    if (!storeId) {
      return res.status(400).json({ message: 'Store not found for this coupon/deal.' });
    }

    // Always create a new vote (allow multiple uses)
    // This allows users to vote multiple times if they use the deal/coupon multiple times
    const vote = new Vote({
      userId,
      couponId: resolvedCouponId,
      dealId: resolvedDealId,
      type,
    });
    await vote.save();
    
    // If it's a thumbs up, track savings (create usage record)
    let shouldTrackSavings = false;
    if (type === 'up') {
      shouldTrackSavings = true;
    }
    
    // Track savings based on vote (always create new usage record for thumbs up)
    // This allows tracking multiple uses of the same deal/coupon
    if (shouldTrackSavings && entity) {
      // Derive an honest savings figure. Prefer known prices; for percentage
      // offers use the spend the user reported (purchaseAmount). If neither is
      // available, the record is saved as used with unknown ($0) savings rather
      // than a fabricated estimate.
      const savings = await buildUsageSavingsFields({ entity, purchaseAmount, purchaseCurrency });

      // Always create a new usage record (allow multiple uses)
      const usage = new CouponUsage({
        userId,
        entityType: resolvedCouponId ? 'coupon' : 'deal',
        entityId: resolvedCouponId || resolvedDealId,
        entityModel: resolvedCouponId ? 'Coupon' : 'Deal',
        storeId,
        ...(savings.discountType ? { discountType: savings.discountType } : {}),
        ...(typeof savings.discountValue === 'number' ? { discountValue: savings.discountValue } : {}),
        purchaseAmount: savings.purchaseAmount,
        ...(savings.purchaseCurrency ? { purchaseCurrency: savings.purchaseCurrency } : {}),
        currency: savings.currency,
        savingsAmount: savings.savingsAmount,
        savingsAmountUsd: savings.savingsAmountUsd || 0,
        savingsKnown: savings.savingsKnown,
        savingsSource: savings.savingsSource,
        ...(savings.exchangeRate != null ? { exchangeRate: savings.exchangeRate } : {}),
        ...(savings.exchangeRateSnapshotAt ? { exchangeRateSnapshotAt: savings.exchangeRateSnapshotAt } : {}),
        exchangeRateSource: savings.exchangeRateSource || 'unknown',
        worked: true, // User confirmed it worked by voting thumbs up
      });
      await usage.save();
    }
    // Note: We don't remove usage records when voting thumbs down
    // Thumbs down only indicates the deal didn't work, but doesn't remove previous successful uses

    // Get updated vote counts
    const voteCounts = await getVoteCounts(resolvedCouponId, resolvedDealId);

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
      const resolvedCouponId = couponId ? await resolveCouponId(couponId) : null;
      const resolvedDealId = dealId ? await resolveDealId(dealId) : null;
      const query = resolvedCouponId
        ? { userId, couponId: resolvedCouponId }
        : { userId, dealId: resolvedDealId };
      const existingVote = await Vote.findOne(query);
      
      if (existingVote) {
        // Return the existing vote as if it was successful
        const voteCounts = await getVoteCounts(resolvedCouponId, resolvedDealId);
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

    const couponId = entityType === 'coupon' ? await resolveCouponId(entityId) : null;
    const dealId = entityType === 'deal' ? await resolveDealId(entityId) : null;

    if (entityType === 'coupon' && !couponId) {
      return res.status(404).json({ message: 'Coupon not found.' });
    }
    if (entityType === 'deal' && !dealId) {
      return res.status(404).json({ message: 'Deal not found.' });
    }

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

