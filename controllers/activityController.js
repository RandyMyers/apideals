/**
 * Activity Controller
 * Handles recent activity endpoints for admin dashboard
 */

const User = require('../models/user');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const Store = require('../models/store');
const Campaign = require('../models/campaign');

/**
 * Get recent activities for admin dashboard
 * Combines recent activities from multiple sources
 */
exports.getRecentActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const activitiesLimit = parseInt(limit);

    // Fetch recent activities from different sources
    const [
      recentUsers,
      recentCoupons,
      recentDeals,
      recentStores,
      recentCampaigns,
    ] = await Promise.all([
      // Recent user registrations (last 7 days)
      User.find({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('username email createdAt')
        .lean(),

      // Recent coupon creations (last 7 days)
      Coupon.find({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title code createdAt')
        .populate('storeId', 'name')
        .lean(),

      // Recent deal creations (last 7 days)
      Deal.find({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title name createdAt')
        .populate('store', 'name')
        .lean(),

      // Recent store creations/approvals (last 7 days)
      Store.find({
        $or: [
          { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          { updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('name isActive createdAt updatedAt')
        .lean(),

      // Recent campaign updates (last 7 days)
      Campaign.find({
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('name status updatedAt')
        .lean(),
    ]);

    // Format activities
    const activities = [];

    // Add user registrations
    recentUsers.forEach((user) => {
      activities.push({
        id: user._id.toString(),
        type: 'user_registration',
        title: 'New user registration',
        description: `${user.username || user.email} joined the platform`,
        timestamp: user.createdAt,
        icon: '👤',
        color: '#3b82f6',
      });
    });

    // Add coupon creations
    recentCoupons.forEach((coupon) => {
      activities.push({
        id: coupon._id.toString(),
        type: 'coupon_created',
        title: 'Coupon created successfully',
        description: `${coupon.title || coupon.code}${coupon.storeId?.name ? ` for ${coupon.storeId.name}` : ''}`,
        timestamp: coupon.createdAt,
        icon: '🎫',
        color: '#10b981',
      });
    });

    // Add deal creations
    recentDeals.forEach((deal) => {
      activities.push({
        id: deal._id.toString(),
        type: 'deal_created',
        title: 'Deal created',
        description: `${deal.title || deal.name}${deal.store?.name ? ` for ${deal.store.name}` : ''}`,
        timestamp: deal.createdAt,
        icon: '🔥',
        color: '#f59e0b',
      });
    });

    // Add store activities
    recentStores.forEach((store) => {
      const isNew = store.createdAt && 
        new Date(store.createdAt).getTime() > new Date(Date.now() - 24 * 60 * 60 * 1000).getTime();
      
      activities.push({
        id: store._id.toString(),
        type: isNew ? 'store_created' : 'store_updated',
        title: isNew ? 'Store created' : store.isActive ? 'Store approved' : 'Store updated',
        description: `${store.name}${isNew ? ' was added' : store.isActive ? ' was approved' : ' was updated'}`,
        timestamp: store.updatedAt || store.createdAt,
        icon: '🏪',
        color: '#8b5cf6',
      });
    });

    // Add campaign updates
    recentCampaigns.forEach((campaign) => {
      activities.push({
        id: campaign._id.toString(),
        type: 'campaign_updated',
        title: 'Campaign updated',
        description: `${campaign.name} status: ${campaign.status || 'active'}`,
        timestamp: campaign.updatedAt,
        icon: '📊',
        color: '#ec4899',
      });
    });

    // Sort by timestamp (most recent first) and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, activitiesLimit)
      .map((activity) => ({
        ...activity,
        timeAgo: getTimeAgo(activity.timestamp),
      }));

    res.json({
      success: true,
      activities: sortedActivities,
      count: sortedActivities.length,
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent activities',
      error: error.message,
    });
  }
};

/**
 * Helper function to calculate time ago
 */
function getTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now - time) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
}


