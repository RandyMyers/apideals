const mongoose = require('mongoose');
const CouponUsage = require('../models/couponUsage');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const Store = require('../models/store');

/**
 * Mark a coupon or deal as used
 * POST /api/v1/coupon-usage
 */
exports.markAsUsed = async (req, res) => {
  try {
    const { entityType, entityId, purchaseAmount, worked = true, notes } = req.body;
    const userId = req.user.id;

    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'entityType and entityId are required'
      });
    }

    if (!['coupon', 'deal'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: 'entityType must be "coupon" or "deal"'
      });
    }

    // Get the coupon or deal
    const EntityModel = entityType === 'coupon' ? Coupon : Deal;
    const entity = await EntityModel.findById(entityId);

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: `${entityType} not found`
      });
    }

    // Get store ID
    const storeId = entity.storeId || entity.store;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'Store not found for this coupon/deal'
      });
    }

    // Check if already used (optional - you might want to allow multiple uses)
    // For now, we'll allow multiple uses but track them separately

    // Create usage record
    const usage = new CouponUsage({
      userId,
      entityType,
      entityId,
      entityModel: entityType === 'coupon' ? 'Coupon' : 'Deal',
      storeId,
      discountType: entity.discountType,
      discountValue: entity.discountValue,
      purchaseAmount: purchaseAmount || 0,
      worked,
      notes,
    });

    await usage.save();

    // Populate entity and store for response
    await usage.populate([
      { path: 'entityId', select: 'title name code discountType discountValue' },
      { path: 'storeId', select: 'name logo' }
    ]);

    res.status(201).json({
      success: true,
      message: `${entityType} marked as used successfully`,
      data: usage
    });
  } catch (error) {
    console.error('Error marking as used:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking as used',
      error: error.message
    });
  }
};

/**
 * Get user's coupon/deal usage history
 * GET /api/v1/coupon-usage/user/:userId
 */
exports.getUserUsageHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;

    // Validate userId format early to avoid ObjectId cast errors
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userId format for savings statistics',
      });
    }

    // Check if user is requesting their own history or is admin
    if (userId !== requestingUserId && req.user.userType !== 'superAdmin') {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own usage history'
      });
    }

    const { page = 1, limit = 20, entityType, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { userId, worked: true };
    if (entityType) query.entityType = entityType;
    if (startDate || endDate) {
      query.usedAt = {};
      if (startDate) query.usedAt.$gte = new Date(startDate);
      if (endDate) query.usedAt.$lte = new Date(endDate);
    }

    const [usageHistory, total] = await Promise.all([
      CouponUsage.find(query)
        .populate('entityId', 'title name code imageUrl')
        .populate('storeId', 'name logo')
        .sort({ usedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CouponUsage.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: usageHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      pages: Math.ceil(total / limit)
    }
  });
  } catch (error) {
    console.error('Error fetching usage history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching usage history',
      error: error.message
    });
  }
};

/**
 * Get user's savings statistics
 * GET /api/v1/coupon-usage/user/:userId/statistics
 */
exports.getUserSavingsStatistics = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;

    // Check if user is requesting their own stats or is admin
    if (userId !== requestingUserId && req.user.userType !== 'superAdmin') {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own statistics'
      });
    }

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get total savings
    const totalSavings = await CouponUsage.getTotalSavings(userObjectId);

    // Get current month savings
    const now = new Date();
    const currentMonthSavings = await CouponUsage.getMonthlySavings(
      userObjectId,
      now.getFullYear(),
      now.getMonth() + 1
    );

    // Get last month savings
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthSavings = await CouponUsage.getMonthlySavings(
      userObjectId,
      lastMonth.getFullYear(),
      lastMonth.getMonth() + 1
    );

    // Get usage stats
    const usageStats = await CouponUsage.getUsageStats(userObjectId);

    // Get savings by category - separate queries for coupons and deals
    // Get coupon usage with categories
    const couponUsage = await CouponUsage.find({
      userId: userObjectId,
      worked: true,
      entityType: 'coupon'
    }).populate({
      path: 'entityId',
      select: 'categoryId',
      populate: { path: 'categoryId', select: 'name' }
    }).lean();

    // Get deal usage with categories
    const dealUsage = await CouponUsage.find({
      userId: userObjectId,
      worked: true,
      entityType: 'deal'
    }).populate({
      path: 'entityId',
      select: 'categoryId',
      populate: { path: 'categoryId', select: 'name' }
    }).lean();

    // Combine and group by category
    const categoryMap = new Map();
    
    [...couponUsage, ...dealUsage].forEach(usage => {
      const categoryId = usage.entityId?.categoryId?._id || null;
      const categoryName = usage.entityId?.categoryId?.name || 'Uncategorized';
      
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          categoryId,
          categoryName,
          totalSavings: 0,
          count: 0
        });
      }
      
      const category = categoryMap.get(categoryId);
      category.totalSavings += usage.savingsAmount || 0;
      category.count += 1;
    });

    const categorySavings = Array.from(categoryMap.values())
      .sort((a, b) => b.totalSavings - a.totalSavings)
      .slice(0, 10);

    // Get savings by store
    const storeSavings = await CouponUsage.aggregate([
      { $match: { userId: userObjectId, worked: true } },
      {
        $group: {
          _id: '$storeId',
          totalSavings: { $sum: '$savingsAmount' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'stores',
          localField: '_id',
          foreignField: '_id',
          as: 'store'
        }
      },
      { $unwind: '$store' },
      {
        $project: {
          storeId: '$_id',
          storeName: '$store.name',
          storeLogo: '$store.logo',
          totalSavings: 1,
          count: 1
        }
      },
      { $sort: { totalSavings: -1 } },
      { $limit: 10 }
    ]);

    // Calculate yearly estimate (simple: based on current month * 12)
    const yearlyEstimate = currentMonthSavings > 0
      ? currentMonthSavings * 12
      : totalSavings;

    // Calculate trend
    const trend = lastMonthSavings > 0
      ? ((currentMonthSavings - lastMonthSavings) / lastMonthSavings) * 100
      : 0;

    res.json({
      success: true,
      data: {
        savings: {
          total: totalSavings,
          monthly: currentMonthSavings,
          lastMonth: lastMonthSavings,
          yearlyEstimate: Math.round(yearlyEstimate),
          trend: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
          trendPercentage: Math.abs(Math.round(trend))
        },
        usage: {
          couponsUsed: usageStats.couponsUsed,
          dealsUsed: usageStats.dealsUsed,
          totalUsed: usageStats.totalUsed,
          couponSavings: usageStats.couponSavings,
          dealSavings: usageStats.dealSavings
        },
        topCategories: categorySavings.map(cat => ({
          categoryId: cat.categoryId,
          categoryName: cat.categoryName || 'Uncategorized',
          totalSavings: cat.totalSavings,
          count: cat.count,
        })),
        topStores: storeSavings.map(store => ({
          storeId: store.storeId,
          storeName: store.storeName,
          storeLogo: store.storeLogo,
          totalSavings: store.totalSavings,
          count: store.count
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching savings statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching savings statistics',
      error: error.message
    });
  }
};

