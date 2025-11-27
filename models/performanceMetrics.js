/**
 * Performance Metrics Model
 * Stores Core Web Vitals and performance data
 */

const mongoose = require('mongoose');

const performanceMetricsSchema = new mongoose.Schema({
  // Page information
  pageUrl: {
    type: String,
    required: true,
    index: true,
  },
  pageTitle: {
    type: String,
  },
  
  // Core Web Vitals
  LCP: {
    value: Number,
    rating: {
      type: String,
      enum: ['good', 'needs-improvement', 'poor'],
    },
    element: String,
  },
  FID: {
    value: Number,
    rating: {
      type: String,
      enum: ['good', 'needs-improvement', 'poor'],
    },
    eventType: String,
  },
  CLS: {
    value: Number,
    rating: {
      type: String,
      enum: ['good', 'needs-improvement', 'poor'],
    },
    entries: Number,
  },
  
  // Additional metrics
  FCP: {
    value: Number,
    rating: {
      type: String,
      enum: ['good', 'needs-improvement', 'poor'],
    },
  },
  TTFB: {
    value: Number,
    rating: {
      type: String,
      enum: ['good', 'needs-improvement', 'poor'],
    },
  },
  
  // Overall performance score
  performanceScore: {
    score: Number,
    maxScore: Number,
    percentage: Number,
    rating: {
      type: String,
      enum: ['good', 'needs-improvement', 'poor'],
    },
  },
  
  // User agent and device info
  userAgent: String,
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
  },
  connectionType: String,
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  
  // Metadata
  sessionId: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
performanceMetricsSchema.index({ pageUrl: 1, timestamp: -1 });
performanceMetricsSchema.index({ timestamp: -1 });
performanceMetricsSchema.index({ 'performanceScore.rating': 1 });

// Static method to get average metrics for a page
performanceMetricsSchema.statics.getAverageMetrics = async function(pageUrl, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const metrics = await this.aggregate([
    {
      $match: {
        pageUrl: pageUrl,
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        avgLCP: { $avg: '$LCP.value' },
        avgFID: { $avg: '$FID.value' },
        avgCLS: { $avg: '$CLS.value' },
        avgFCP: { $avg: '$FCP.value' },
        avgTTFB: { $avg: '$TTFB.value' },
        avgPerformanceScore: { $avg: '$performanceScore.score' },
        count: { $sum: 1 },
      },
    },
  ]);

  return metrics[0] || null;
};

// Static method to get performance trends
performanceMetricsSchema.statics.getPerformanceTrends = async function(pageUrl, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const trends = await this.aggregate([
    {
      $match: {
        pageUrl: pageUrl,
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
        },
        avgPerformanceScore: { $avg: '$performanceScore.score' },
        avgLCP: { $avg: '$LCP.value' },
        avgFID: { $avg: '$FID.value' },
        avgCLS: { $avg: '$CLS.value' },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  return trends;
};

module.exports = mongoose.model('PerformanceMetrics', performanceMetricsSchema);

