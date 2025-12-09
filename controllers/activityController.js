/**
 * Activity Controller
 * Handles recent activity endpoints for admin dashboard
 */

const User = require('../models/user');
const Coupon = require('../models/coupon');
const Deal = require('../models/deal');
const Store = require('../models/store');
const Campaign = require('../models/campaign');
const View = require('../models/view');
const Interaction = require('../models/interaction');
const CouponUsage = require('../models/couponUsage');
const Visitor = require('../models/visitor');

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

/**
 * Get all user activities (Admin only)
 * Queries View, Interaction, and CouponUsage models directly
 * GET /api/v1/activities/all
 */
exports.getAllActivities = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, type, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;
    const mongoose = require('mongoose');

    const userFilter = userId ? { userId } : {};
    let activities = [];

    // Get views - DIRECT ACCESS to View model
    if (!type || type === 'view') {
      const viewFilter = { ...userFilter };
      if (startDate || endDate) {
        viewFilter.viewedAt = {};
        if (startDate) viewFilter.viewedAt.$gte = new Date(startDate);
        if (endDate) viewFilter.viewedAt.$lte = new Date(endDate);
      }

      const views = await View.find(viewFilter)
        .populate('userId', 'username email')
        .populate('visitorId', 'country deviceType platform') // DIRECT ACCESS to Visitor
        .populate('entityId', 'title name code imageUrl')
        .populate('storeId', 'name logo')
        .populate('couponId', 'title code imageUrl')
        .populate('dealId', 'title name imageUrl')
        .sort({ viewedAt: -1 })
        .skip(type === 'view' ? skip : 0)
        .limit(type === 'view' ? parseInt(limit) : 10)
        .lean();

      activities.push(...views.map(v => ({
        type: 'view',
        userId: v.userId,
        visitorId: v.visitorId,
        country: v.visitorId?.country || null, // DIRECT ACCESS from populated visitorId
        deviceType: v.visitorId?.deviceType || v.visitorId?.platform || null,
        entityType: v.entityType || (v.couponId ? 'coupon' : v.dealId ? 'deal' : v.storeId ? 'store' : 'category'),
        entityId: v.entityId || v.couponId || v.dealId || v.storeId,
        storeId: v.storeId,
        createdAt: v.viewedAt || v.createdAt,
        data: v
      })));
    }

    // Get interactions - DIRECT ACCESS to Interaction model
    if (!type || type === 'interaction') {
      const interactionFilter = { ...userFilter };
      if (startDate || endDate) {
        interactionFilter.interactionAt = {};
        if (startDate) interactionFilter.interactionAt.$gte = new Date(startDate);
        if (endDate) interactionFilter.interactionAt.$lte = new Date(endDate);
      }

      const interactions = await Interaction.find(interactionFilter)
        .populate('userId', 'username email')
        .populate('visitorId', 'country deviceType platform') // DIRECT ACCESS to Visitor
        .populate('entityId', 'title name code imageUrl')
        .populate('storeId', 'name logo')
        .populate('couponId', 'title code imageUrl')
        .populate('dealId', 'title name imageUrl')
        .sort({ interactionAt: -1 })
        .skip(type === 'interaction' ? skip : 0)
        .limit(type === 'interaction' ? parseInt(limit) : 10)
        .lean();

      activities.push(...interactions.map(i => ({
        type: 'interaction',
        userId: i.userId,
        visitorId: i.visitorId,
        country: i.visitorId?.country || null, // DIRECT ACCESS from populated visitorId
        deviceType: i.visitorId?.deviceType || i.visitorId?.platform || null,
        interactionType: i.interactionType || i.type,
        entityType: i.entityType || (i.couponId ? 'coupon' : i.dealId ? 'deal' : i.storeId ? 'store' : 'category'),
        entityId: i.entityId || i.couponId || i.dealId || i.storeId,
        storeId: i.storeId,
        createdAt: i.interactionAt || i.createdAt,
        data: i
      })));
    }

    // Get usage - DIRECT ACCESS to CouponUsage model
    if (!type || type === 'usage') {
      const usageFilter = { ...userFilter, worked: true };
      if (startDate || endDate) {
        usageFilter.usedAt = {};
        if (startDate) usageFilter.usedAt.$gte = new Date(startDate);
        if (endDate) usageFilter.usedAt.$lte = new Date(endDate);
      }

      const usages = await CouponUsage.find(usageFilter)
        .populate('userId', 'username email')
        .populate('entityId', 'title name code imageUrl')
        .populate('storeId', 'name logo')
        .sort({ usedAt: -1 })
        .skip(type === 'usage' ? skip : 0)
        .limit(type === 'usage' ? parseInt(limit) : 10)
        .lean();

      // For usage, get visitor by userId (fallback)
      const usageUserIds = [...new Set(usages.map(u => u.userId?._id || u.userId).filter(Boolean))];
      const usageVisitors = await Visitor.find({
        userId: { $in: usageUserIds }
      })
      .sort({ visitedAt: -1 })
      .select('userId country deviceType platform')
      .lean();

      const usageVisitorMap = new Map();
      usageVisitors.forEach(v => {
        if (v.userId) {
          const uid = v.userId.toString();
          if (!usageVisitorMap.has(uid)) {
            usageVisitorMap.set(uid, {
              country: v.country,
              deviceType: v.deviceType || v.platform
            });
          }
        }
      });

      activities.push(...usages.map(u => {
        const uid = (u.userId?._id || u.userId)?.toString();
        const visitor = usageVisitorMap.get(uid);
        return {
          type: 'usage',
          userId: u.userId,
          country: visitor?.country || null,
          deviceType: visitor?.deviceType || null,
          entityType: u.entityType,
          entityId: u.entityId,
          storeId: u.storeId,
          savingsAmount: u.savingsAmount,
          createdAt: u.usedAt,
          data: u
        };
      }));
    }

    // Sort all activities by date
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginate
    const paginatedActivities = activities.slice(skip, skip + parseInt(limit));
    const total = activities.length;

    res.json({
      success: true,
      data: paginatedActivities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching all activities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching all activities',
      error: error.message
    });
  }
};

/**
 * Get top pages by view count (for SEO analysis)
 * GET /api/v1/activities/top-pages
 */
exports.getTopPages = async (req, res) => {
  try {
    const { limit = 20, startDate, endDate } = req.query;
    const View = require('../models/view');

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.viewedAt = {};
      if (startDate) dateFilter.viewedAt.$gte = new Date(startDate);
      if (endDate) dateFilter.viewedAt.$lte = new Date(endDate);
    }

    // Aggregate views by pagePath
    const topPages = await View.aggregate([
      // Match views with pagePath and apply date filter
      {
        $match: {
          pagePath: { $exists: true, $ne: null, $ne: '' },
          ...dateFilter
        }
      },
      // Group by pagePath
      {
        $group: {
          _id: '$pagePath',
          viewCount: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$visitorId' },
          languageCode: { $first: '$languageCode' },
          referrers: { $addToSet: '$referrer' },
          lastViewed: { $max: '$viewedAt' }
        }
      },
      // Lookup visitor data for countries and devices
      {
        $lookup: {
          from: 'visitors',
          localField: 'uniqueVisitors',
          foreignField: '_id',
          as: 'visitorData'
        }
      },
      // Project and calculate unique counts
      {
        $project: {
          pagePath: '$_id',
          languageCode: 1,
          viewCount: 1,
          uniqueVisitors: { $size: { $filter: { input: '$uniqueVisitors', as: 'v', cond: { $ne: ['$$v', null] } } } },
          lastViewed: 1,
          visitorData: 1,
          referrers: 1
        }
      },
      // Sort by view count
      {
        $sort: { viewCount: -1 }
      },
      // Limit results
      {
        $limit: parseInt(limit)
      }
    ]);

    // Post-process to aggregate countries, devices, and referrers
    const processedPages = await Promise.all(topPages.map(async (page) => {
      // Get unique visitor IDs
      const visitorIds = page.uniqueVisitors.filter(v => v !== null);
      
      // Fetch visitor data for countries and devices
      const Visitor = require('../models/visitor');
      const visitors = await Visitor.find({
        _id: { $in: visitorIds }
      }).select('country deviceType platform').lean();

      // Aggregate countries
      const countryMap = {};
      visitors.forEach(v => {
        if (v.country) {
          countryMap[v.country] = (countryMap[v.country] || 0) + 1;
        }
      });
      const countries = Object.entries(countryMap)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Aggregate devices
      const deviceMap = {};
      visitors.forEach(v => {
        const device = v.deviceType || v.platform || 'Unknown';
        deviceMap[device] = (deviceMap[device] || 0) + 1;
      });
      const devices = Object.entries(deviceMap)
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Aggregate referrers
      const referrerMap = {};
      page.referrers.forEach(ref => {
        if (ref) {
          const source = ref === '' ? 'direct' : ref;
          referrerMap[source] = (referrerMap[source] || 0) + 1;
        }
      });
      const referrers = Object.entries(referrerMap)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        pagePath: page.pagePath,
        languageCode: page.languageCode || 'en',
        viewCount: page.viewCount,
        uniqueVisitors: page.uniqueVisitors,
        countries,
        devices,
        referrers,
        lastViewed: page.lastViewed
      };
    }));

    res.json({
      success: true,
      data: processedPages,
      count: processedPages.length
    });
  } catch (error) {
    console.error('Error fetching top pages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching top pages',
      error: error.message
    });
  }
};

/**
 * Get live activity (active visitors in last 5 minutes)
 * GET /api/v1/activities/live
 */
exports.getLiveActivity = async (req, res) => {
  try {
    const View = require('../models/view');
    const Visitor = require('../models/visitor');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Get all views in last 5 minutes
    const recentViews = await View.find({
      viewedAt: { $gte: fiveMinutesAgo }
    })
      .populate('visitorId', 'country deviceType platform ip city')
      .populate('userId', 'username email')
      .sort({ viewedAt: -1 })
      .lean();

    // Group by visitorId to get latest activity per visitor
    const visitorMap = new Map();

    recentViews.forEach(view => {
      const visitorId = view.visitorId?._id?.toString() || view.visitorId?.toString() || 'anonymous';
      const userId = view.userId?._id?.toString() || view.userId?.toString();

      if (!visitorMap.has(visitorId)) {
        // Get session start (first view in last 30 minutes)
        const sessionStart = new Date(Date.now() - 30 * 60 * 1000);
        const sessionViews = recentViews.filter(v => {
          const vId = v.visitorId?._id?.toString() || v.visitorId?.toString();
          return vId === visitorId && new Date(v.viewedAt) >= sessionStart;
        });

        visitorMap.set(visitorId, {
          visitorId: view.visitorId?._id || view.visitorId,
          userId: view.userId?._id || view.userId,
          country: view.visitorId?.country || null,
          deviceType: view.visitorId?.deviceType || view.visitorId?.platform || null,
          currentPage: view.pagePath || null,
          languageCode: view.languageCode || 'en',
          lastActivity: view.viewedAt,
          sessionStart: sessionViews.length > 0 ? sessionViews[sessionViews.length - 1].viewedAt : view.viewedAt,
          pageViewsInSession: sessionViews.length,
          referrer: view.referrer || null,
          ip: view.visitorId?.ip || null,
          city: view.visitorId?.city || null,
          username: view.userId?.username || view.userId?.email || 'Guest'
        });
      } else {
        // Update with latest activity
        const existing = visitorMap.get(visitorId);
        if (new Date(view.viewedAt) > new Date(existing.lastActivity)) {
          existing.currentPage = view.pagePath || existing.currentPage;
          existing.languageCode = view.languageCode || existing.languageCode;
          existing.lastActivity = view.viewedAt;
        }
      }
    });

    // Convert to array and calculate time on page
    const liveVisitors = Array.from(visitorMap.values()).map(visitor => {
      const timeOnPage = Math.floor((Date.now() - new Date(visitor.lastActivity).getTime()) / 1000);
      const sessionDuration = Math.floor((Date.now() - new Date(visitor.sessionStart).getTime()) / 1000);

      return {
        ...visitor,
        timeOnPage, // seconds
        sessionDuration, // seconds
        isActive: timeOnPage < 300 // Active if last activity < 5 minutes
      };
    });

    // Sort by last activity (most recent first)
    liveVisitors.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

    res.json({
      success: true,
      data: liveVisitors,
      count: liveVisitors.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching live activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching live activity',
      error: error.message
    });
  }
};

