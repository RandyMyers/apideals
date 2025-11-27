/**
 * Performance Controller
 * Handles performance metrics API requests
 */

const performanceService = require('../services/performanceService');

/**
 * Submit performance metrics
 */
exports.submitMetrics = async (req, res) => {
  try {
    const metricsData = {
      ...req.body,
      userAgent: req.get('user-agent'),
      sessionId: req.session?.id,
      userId: req.user?.id,
    };

    const metrics = await performanceService.saveMetrics(metricsData);
    
    res.status(201).json({
      success: true,
      message: 'Metrics saved successfully',
      metrics: metrics._id,
    });
  } catch (error) {
    console.error('Error submitting metrics:', error);
    res.status(500).json({
      error: 'Failed to submit metrics',
      message: error.message,
    });
  }
};

/**
 * Get average metrics for a page
 */
exports.getPageMetrics = async (req, res) => {
  try {
    const { pageUrl } = req.params;
    const days = parseInt(req.query.days) || 30;

    const metrics = await performanceService.getAverageMetrics(pageUrl, days);
    
    if (!metrics) {
      return res.status(404).json({
        error: 'No metrics found for this page',
      });
    }

    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Error getting page metrics:', error);
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error.message,
    });
  }
};

/**
 * Get performance trends
 */
exports.getPerformanceTrends = async (req, res) => {
  try {
    const { pageUrl } = req.params;
    const days = parseInt(req.query.days) || 30;

    const trends = await performanceService.getPerformanceTrends(pageUrl, days);
    
    res.json({
      success: true,
      trends,
    });
  } catch (error) {
    console.error('Error getting performance trends:', error);
    res.status(500).json({
      error: 'Failed to get trends',
      message: error.message,
    });
  }
};

/**
 * Get all pages with metrics
 */
exports.getPagesWithMetrics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const pages = await performanceService.getPagesWithMetrics(days);
    
    res.json({
      success: true,
      pages,
    });
  } catch (error) {
    console.error('Error getting pages:', error);
    res.status(500).json({
      error: 'Failed to get pages',
      message: error.message,
    });
  }
};

