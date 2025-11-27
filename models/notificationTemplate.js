/**
 * Notification Template Model
 * Defines templates for notifications that can be reused
 */

const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['admin', 'client', 'both'],
    required: true,
    default: 'client',
  },
  category: {
    type: String,
    enum: ['system', 'coupon', 'deal', 'user', 'store', 'payment', 'subscription', 'achievement'],
    required: true,
    default: 'system',
  },
  placeholders: {
    type: [String],
    default: [],
  },
  icon: {
    type: String,
    default: 'FiInfo',
  },
  color: {
    type: String,
    default: '#3B82F6', // Default blue
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  description: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
notificationTemplateSchema.index({ type: 1, category: 1, isActive: 1 });
notificationTemplateSchema.index({ name: 1 });

const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);

module.exports = NotificationTemplate;


