/**
 * Notification Model
 * Stores individual notifications for users
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NotificationTemplate',
    default: null,
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
    enum: ['admin', 'client'],
    required: true,
    default: 'client',
  },
  category: {
    type: String,
    enum: ['system', 'coupon', 'deal', 'user', 'store', 'payment', 'subscription', 'achievement'],
    default: 'system',
  },
  icon: {
    type: String,
    default: 'FiInfo',
  },
  color: {
    type: String,
    default: '#3B82F6',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: {
    type: Date,
    default: null,
  },
  actionUrl: {
    type: String,
    trim: true,
    default: null,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  expiresAt: {
    type: Date,
    default: null,
    index: { expireAfterSeconds: 0 }, // Auto-delete expired notifications
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;


