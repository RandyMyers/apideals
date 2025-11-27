const Visitor = require('../models/visitor');
const User = require('../models/user');
const View = require('../models/view');
const Interaction = require('../models/interaction');
const { logger } = require('../utils/logger');

/**
 * Get users aggregated by location (country)
 * Returns count and percentage per country
 */
exports.getUsersByLocation = async (req, res) => {
  try {
    // Get all users with their visitor data
    // We need to join users with visitors to get location data
    const visitors = await Visitor.find({ userId: { $exists: true, $ne: null } })
      .select('userId country')
      .populate('userId', 'name email')
      .lean();

    // Aggregate by country
    const countryMap = {};
    let totalUsers = 0;

    visitors.forEach(visitor => {
      if (visitor.country && visitor.userId) {
        const country = visitor.country;
        if (!countryMap[country]) {
          countryMap[country] = { country, count: 0, userIds: new Set() };
        }
        if (visitor.userId._id) {
          countryMap[country].userIds.add(visitor.userId._id.toString());
        }
      }
    });

    // Count unique users per country
    const result = Object.values(countryMap).map(item => ({
      country: item.country,
      count: item.userIds.size,
    }));

    totalUsers = result.reduce((sum, item) => sum + item.count, 0);

    // Calculate percentages
    const resultWithPercentages = result.map(item => ({
      ...item,
      percentage: totalUsers > 0 ? ((item.count / totalUsers) * 100).toFixed(2) : 0,
    }));

    // Sort by count descending
    resultWithPercentages.sort((a, b) => b.count - a.count);

    logger.info('Fetched users by location', { totalUsers, countries: resultWithPercentages.length });

    res.status(200).json({
      success: true,
      totalUsers,
      data: resultWithPercentages,
    });
  } catch (error) {
    logger.error('Error fetching users by location', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching users by location',
      error: error.message,
    });
  }
};

/**
 * Get visitors aggregated by location (country)
 * Returns count and percentage per country
 */
exports.getVisitorsByLocation = async (req, res) => {
  try {
    const visitors = await Visitor.find().select('country').lean();

    // Aggregate by country
    const countryMap = {};
    let totalVisitors = visitors.length;

    visitors.forEach(visitor => {
      if (visitor.country) {
        const country = visitor.country;
        if (!countryMap[country]) {
          countryMap[country] = 0;
        }
        countryMap[country]++;
      }
    });

    // Convert to array format
    const result = Object.entries(countryMap).map(([country, count]) => ({
      country,
      count,
      percentage: totalVisitors > 0 ? ((count / totalVisitors) * 100).toFixed(2) : 0,
    }));

    // Sort by count descending
    result.sort((a, b) => b.count - a.count);

    logger.info('Fetched visitors by location', { totalVisitors, countries: result.length });

    res.status(200).json({
      success: true,
      totalVisitors,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching visitors by location', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching visitors by location',
      error: error.message,
    });
  }
};

/**
 * Get total users and visitors statistics
 */
exports.getTotalUsers = async (req, res) => {
  try {
    const [totalUsers, totalVisitors, uniqueVisitors] = await Promise.all([
      User.countDocuments(),
      Visitor.countDocuments(),
      Visitor.distinct('ip').then(ips => ips.length),
    ]);

    // Get registered users count (users with accounts)
    const registeredUsers = await User.countDocuments({});

    // Get growth metrics (users created in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersLast30Days = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Get new visitors in last 30 days
    const newVisitorsLast30Days = await Visitor.countDocuments({
      visitedAt: { $gte: thirtyDaysAgo },
    });

    logger.info('Fetched total users statistics', {
      totalUsers,
      totalVisitors,
      uniqueVisitors,
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers: registeredUsers,
        totalVisitors,
        uniqueVisitors,
        newUsersLast30Days,
        newVisitorsLast30Days,
      },
    });
  } catch (error) {
    logger.error('Error fetching total users', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching total users',
      error: error.message,
    });
  }
};

/**
 * Get views aggregated by location (country)
 * Includes breakdown by content type (store/coupon/deal)
 */
exports.getViewsByLocation = async (req, res) => {
  try {
    const views = await View.find()
      .populate('visitorId', 'country')
      .select('storeId couponId dealId categoryId visitorId')
      .lean();

    // Aggregate by country and content type
    const countryMap = {};

    views.forEach(view => {
      if (view.visitorId && view.visitorId.country) {
        const country = view.visitorId.country;
        if (!countryMap[country]) {
          countryMap[country] = {
            country,
            total: 0,
            stores: 0,
            coupons: 0,
            deals: 0,
            categories: 0,
          };
        }

        countryMap[country].total++;
        if (view.storeId) countryMap[country].stores++;
        if (view.couponId) countryMap[country].coupons++;
        if (view.dealId) countryMap[country].deals++;
        if (view.categoryId) countryMap[country].categories++;
      }
    });

    const result = Object.values(countryMap);
    const totalViews = result.reduce((sum, item) => sum + item.total, 0);

    // Add percentages
    const resultWithPercentages = result.map(item => ({
      ...item,
      percentage: totalViews > 0 ? ((item.total / totalViews) * 100).toFixed(2) : 0,
    }));

    // Sort by total descending
    resultWithPercentages.sort((a, b) => b.total - a.total);

    logger.info('Fetched views by location', { totalViews, countries: resultWithPercentages.length });

    res.status(200).json({
      success: true,
      totalViews,
      data: resultWithPercentages,
    });
  } catch (error) {
    logger.error('Error fetching views by location', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching views by location',
      error: error.message,
    });
  }
};

/**
 * Get interactions (clicks) aggregated by location (country)
 */
exports.getInteractionsByLocation = async (req, res) => {
  try {
    const { type } = req.query; // Optional filter by interaction type

    const query = {};
    if (type) {
      query.type = type;
    }

    const interactions = await Interaction.find(query)
      .populate('visitorId', 'country')
      .select('type storeId couponId dealId visitorId')
      .lean();

    // Aggregate by country and interaction type
    const countryMap = {};

    interactions.forEach(interaction => {
      if (interaction.visitorId && interaction.visitorId.country) {
        const country = interaction.visitorId.country;
        if (!countryMap[country]) {
          countryMap[country] = {
            country,
            total: 0,
            clicks: 0,
            hovers: 0,
            stores: 0,
            coupons: 0,
            deals: 0,
          };
        }

        countryMap[country].total++;
        
        // Count by interaction type
        if (interaction.type === 'click') countryMap[country].clicks++;
        if (interaction.type === 'hover') countryMap[country].hovers++;

        // Count by content type
        if (interaction.storeId) countryMap[country].stores++;
        if (interaction.couponId) countryMap[country].coupons++;
        if (interaction.dealId) countryMap[country].deals++;
      }
    });

    const result = Object.values(countryMap);
    const totalInteractions = result.reduce((sum, item) => sum + item.total, 0);

    // Add percentages
    const resultWithPercentages = result.map(item => ({
      ...item,
      percentage: totalInteractions > 0 ? ((item.total / totalInteractions) * 100).toFixed(2) : 0,
    }));

    // Sort by total descending
    resultWithPercentages.sort((a, b) => b.total - a.total);

    logger.info('Fetched interactions by location', {
      totalInteractions,
      countries: resultWithPercentages.length,
      type,
    });

    res.status(200).json({
      success: true,
      totalInteractions,
      data: resultWithPercentages,
    });
  } catch (error) {
    logger.error('Error fetching interactions by location', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching interactions by location',
      error: error.message,
    });
  }
};


