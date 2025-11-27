/**
 * Performance Service
 * Handles performance metrics storage and analysis
 */

const PerformanceMetrics = require('../models/performanceMetrics');

/**
 * Save performance metrics
 */
exports.saveMetrics = async (metricsData) => {
  try {
    const {
      pageUrl,
      pageTitle,
      LCP,
      FID,
      CLS,
      FCP,
      TTFB,
      performanceScore,
      userAgent,
      deviceType,
      connectionType,
      sessionId,
      userId,
    } = metricsData;

    const metrics = new PerformanceMetrics({
      pageUrl,
      pageTitle,
      LCP,
      FID,
      CLS,
      FCP,
      TTFB,
      performanceScore,
      userAgent,
      deviceType: deviceType || detectDeviceType(userAgent),
      connectionType,
      sessionId,
      userId,
    });

    await metrics.save();
    return metrics;
  } catch (error) {
    console.error('Error saving performance metrics:', error);
    throw error;
  }
};

/**
 * Get average metrics for a page
 */
exports.getAverageMetrics = async (pageUrl, days = 30) => {
  try {
    return await PerformanceMetrics.getAverageMetrics(pageUrl, days);
  } catch (error) {
    console.error('Error getting average metrics:', error);
    throw error;
  }
};

/**
 * Get performance trends
 */
exports.getPerformanceTrends = async (pageUrl, days = 30) => {
  try {
    return await PerformanceMetrics.getPerformanceTrends(pageUrl, days);
  } catch (error) {
    console.error('Error getting performance trends:', error);
    throw error;
  }
};

/**
 * Get all pages with performance data
 */
exports.getPagesWithMetrics = async (days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const pages = await PerformanceMetrics.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$pageUrl',
          pageTitle: { $first: '$pageTitle' },
          avgPerformanceScore: { $avg: '$performanceScore.score' },
          avgLCP: { $avg: '$LCP.value' },
          avgFID: { $avg: '$FID.value' },
          avgCLS: { $avg: '$CLS.value' },
          count: { $sum: 1 },
          lastMeasured: { $max: '$timestamp' },
        },
      },
      {
        $sort: { avgPerformanceScore: -1 },
      },
    ]);

    return pages;
  } catch (error) {
    console.error('Error getting pages with metrics:', error);
    throw error;
  }
};

/**
 * Detect device type from user agent
 */
const detectDeviceType = (userAgent) => {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) {
    return 'tablet';
  }
  
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) {
    return 'mobile';
  }
  
  return 'desktop';
};

