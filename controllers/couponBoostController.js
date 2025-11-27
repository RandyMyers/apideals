const CouponBoost = require('../models/couponBoost');
const Coupon = require('../models/coupon');
const { logger } = require('../utils/logger');

// Purchase a boost for a coupon
exports.purchaseBoost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { couponId, boostType, targetId, duration, paymentId, paymentMethod } = req.body;

    // Validate required fields
    if (!couponId || !boostType || !duration || !paymentId || !paymentMethod) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide all required fields for boost purchase'
      });
    }

    // Check if coupon exists and belongs to user
    const coupon = await Coupon.findOne({
      _id: couponId,
      userId
    });

    if (!coupon) {
      return res.status(404).json({
        error: 'Coupon not found',
        message: 'Coupon not found or you do not have permission to boost it'
      });
    }

    // Check if coupon is active
    if (!coupon.isActive || coupon.endDate < new Date()) {
      return res.status(400).json({
        error: 'Invalid coupon',
        message: 'Cannot boost inactive or expired coupons'
      });
    }

    // Validate boost type and target
    if (['category', 'store'].includes(boostType) && !targetId) {
      return res.status(400).json({
        error: 'Target required',
        message: `${boostType} boost requires a target ID`
      });
    }

    // Calculate boost pricing (this would come from a pricing service)
    const pricing = calculateBoostPricing(boostType, duration);
    
    // Create boost
    const boost = new CouponBoost({
      couponId,
      userId,
      boostType,
      targetId,
      duration,
      amount: pricing.amount,
      currency: pricing.currency,
      paymentId,
      paymentMethod,
      status: 'pending'
    });

    await boost.save();

    logger.info('Boost purchased', {
      boostId: boost._id,
      couponId,
      userId,
      boostType,
      amount: pricing.amount
    });

    res.status(201).json({
      message: 'Boost purchased successfully',
      boost: {
        id: boost._id,
        boostType: boost.boostType,
        targetId: boost.targetId,
        duration: boost.duration,
        amount: boost.amount,
        currency: boost.currency,
        status: boost.status
      }
    });

  } catch (error) {
    logger.error('Purchase boost error', {
      error: error.message,
      userId: req.user.id,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Boost purchase failed',
      message: 'An error occurred while purchasing the boost'
    });
  }
};

// Activate a boost (called after successful payment)
exports.activateBoost = async (req, res) => {
  try {
    const { boostId } = req.params;
    const userId = req.user.id;

    const boost = await CouponBoost.findOne({
      _id: boostId,
      userId,
      status: 'pending'
    });

    if (!boost) {
      return res.status(404).json({
        error: 'Boost not found',
        message: 'Boost not found or cannot be activated'
      });
    }

    await boost.activate();

    logger.info('Boost activated', {
      boostId,
      userId,
      couponId: boost.couponId
    });

    res.json({
      message: 'Boost activated successfully',
      boost: {
        id: boost._id,
        status: boost.status,
        startDate: boost.startDate,
        endDate: boost.endDate
      }
    });

  } catch (error) {
    logger.error('Activate boost error', {
      error: error.message,
      boostId: req.params.boostId,
      userId: req.user.id
    });

    res.status(500).json({
      error: 'Boost activation failed',
      message: 'An error occurred while activating the boost'
    });
  }
};

// Get user's boosts
exports.getUserBoosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    const skip = (page - 1) * limit;
    let query = { userId };

    if (status) {
      query.status = status;
    }

    const boosts = await CouponBoost.find(query)
      .populate('couponId', 'title code storeId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await CouponBoost.countDocuments(query);

    res.json({
      boosts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Get user boosts error', {
      error: error.message,
      userId: req.user.id
    });

    res.status(500).json({
      error: 'Failed to fetch boosts',
      message: 'An error occurred while fetching your boosts'
    });
  }
};

// Get boost by ID
exports.getBoostById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const boost = await CouponBoost.findOne({
      _id: id,
      userId
    }).populate('couponId', 'title code storeId categoryId');

    if (!boost) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Boost not found'
      });
    }

    res.json({ boost });

  } catch (error) {
    logger.error('Get boost error', {
      error: error.message,
      boostId: req.params.id,
      userId: req.user.id
    });

    res.status(500).json({
      error: 'Failed to fetch boost',
      message: 'An error occurred while fetching the boost'
    });
  }
};

// Cancel a boost
exports.cancelBoost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const boost = await CouponBoost.findOne({
      _id: id,
      userId,
      status: { $in: ['pending', 'active'] }
    });

    if (!boost) {
      return res.status(404).json({
        error: 'Boost not found',
        message: 'Boost not found or cannot be cancelled'
      });
    }

    await boost.cancel();

    logger.info('Boost cancelled', {
      boostId: id,
      userId
    });

    res.json({
      message: 'Boost cancelled successfully'
    });

  } catch (error) {
    logger.error('Cancel boost error', {
      error: error.message,
      boostId: req.params.id,
      userId: req.user.id
    });

    res.status(500).json({
      error: 'Cancel failed',
      message: 'An error occurred while cancelling the boost'
    });
  }
};

// Get active boosts for display
exports.getActiveBoosts = async (req, res) => {
  try {
    const { boostType, targetId } = req.query;

    const boosts = await CouponBoost.findActive(boostType, targetId);

    res.json({ boosts });

  } catch (error) {
    logger.error('Get active boosts error', {
      error: error.message,
      boostType: req.query.boostType,
      targetId: req.query.targetId
    });

    res.status(500).json({
      error: 'Failed to fetch active boosts',
      message: 'An error occurred while fetching active boosts'
    });
  }
};

// Track boost impression
exports.trackImpression = async (req, res) => {
  try {
    const { boostId } = req.params;

    const boost = await CouponBoost.findById(boostId);
    if (!boost) {
      return res.status(404).json({
        error: 'Boost not found',
        message: 'Boost not found'
      });
    }

    await boost.incrementImpressions();

    res.json({ success: true });

  } catch (error) {
    logger.error('Track impression error', {
      error: error.message,
      boostId: req.params.boostId
    });

    res.status(500).json({
      error: 'Failed to track impression',
      message: 'An error occurred while tracking impression'
    });
  }
};

// Track boost click
exports.trackClick = async (req, res) => {
  try {
    const { boostId } = req.params;

    const boost = await CouponBoost.findById(boostId);
    if (!boost) {
      return res.status(404).json({
        error: 'Boost not found',
        message: 'Boost not found'
      });
    }

    await boost.incrementClicks();

    res.json({ success: true });

  } catch (error) {
    logger.error('Track click error', {
      error: error.message,
      boostId: req.params.boostId
    });

    res.status(500).json({
      error: 'Failed to track click',
      message: 'An error occurred while tracking click'
    });
  }
};

// Admin: Get boost statistics
exports.getBoostStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let stats;
    if (startDate && endDate) {
      stats = await CouponBoost.getRevenueStats(
        new Date(startDate),
        new Date(endDate)
      );
    } else {
      stats = await CouponBoost.getStats();
    }

    res.json({ stats });

  } catch (error) {
    logger.error('Get boost stats error', {
      error: error.message,
      userId: req.user.id
    });

    res.status(500).json({
      error: 'Failed to fetch boost statistics',
      message: 'An error occurred while fetching boost statistics'
    });
  }
};

// Helper function to calculate boost pricing
function calculateBoostPricing(boostType, duration) {
  const basePrices = {
    homepage: 50,
    category: 25,
    store: 15,
    search: 10
  };

  const basePrice = basePrices[boostType] || 10;
  const totalAmount = basePrice * duration;
  
  return {
    amount: totalAmount,
    currency: 'USD'
  };
}

module.exports = exports;


