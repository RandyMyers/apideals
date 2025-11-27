/**
 * Stats Controller
 * Handles statistics endpoints for homepage and dashboards
 */

const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const Store = require('../models/store');
const User = require('../models/user');
const RateAndReview = require('../models/rateAndReview');

/**
 * Get homepage statistics
 * Returns aggregated stats for the homepage hero section
 */
exports.getHomepageStats = async (req, res) => {
  try {
    // Count active coupons
    const activeCoupons = await Coupon.countDocuments({ isActive: true });

    // Count total users
    const totalUsers = await User.countDocuments();

    // Count partner stores (stores that are active and have deals/coupons)
    const partnerStores = await Store.countDocuments({ 
      isActive: true,
      // Optionally filter by stores that have active coupons/deals
    });

    // Calculate average rating from reviews
    const ratingAggregation = await RateAndReview.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const averageRating = ratingAggregation.length > 0 && ratingAggregation[0].averageRating
      ? parseFloat(ratingAggregation[0].averageRating.toFixed(1))
      : 4.8; // Default if no reviews

    // Format numbers for display
    const formatNumber = (num) => {
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M+`;
      } else if (num >= 1000) {
        return `${(num / 1000).toFixed(0)}K+`;
      }
      return `${num}+`;
    };

    res.json({
      success: true,
      stats: {
        activeCoupons: activeCoupons,
        activeCouponsFormatted: formatNumber(activeCoupons),
        totalUsers: totalUsers,
        totalUsersFormatted: formatNumber(totalUsers),
        partnerStores: partnerStores,
        partnerStoresFormatted: formatNumber(partnerStores),
        averageRating: averageRating,
        averageRatingFormatted: averageRating.toFixed(1),
      },
    });
  } catch (error) {
    console.error('Error fetching homepage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching homepage statistics',
      error: error.message,
    });
  }
};


