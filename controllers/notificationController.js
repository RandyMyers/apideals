/**
 * Notification Controller
 * Handles notification-related API endpoints
 */

const notificationService = require('../services/notificationService');
const Notification = require('../models/notification');

/**
 * Get user's notifications
 * GET /api/v1/notifications
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { isRead, category, limit = 20, skip = 0 } = req.query;

    const filters = {
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      category,
      limit: parseInt(limit),
      skip: parseInt(skip),
    };

    const notifications = await notificationService.getUserNotifications(userId, filters);

    res.json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message,
    });
  }
};

/**
 * Get unread notification count
 * GET /api/v1/notifications/unread-count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: error.message,
    });
  }
};

/**
 * Get notification by ID
 * GET /api/v1/notifications/:id
 */
exports.getNotificationById = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Error getting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification',
      error: error.message,
    });
  }
};

/**
 * Mark notification as read
 * PUT /api/v1/notifications/:id/read
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    const notification = await notificationService.markAsRead(id, userId);

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error marking notification as read',
      error: error.message,
    });
  }
};

/**
 * Mark all notifications as read
 * PUT /api/v1/notifications/read-all
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const result = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read',
      error: error.message,
    });
  }
};

/**
 * Delete notification
 * DELETE /api/v1/notifications/:id
 */
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    await notificationService.deleteNotification(id, userId);

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting notification',
      error: error.message,
    });
  }
};

/**
 * Send notification (admin/system only)
 * POST /api/v1/notifications/send
 */
exports.sendNotification = async (req, res) => {
  try {
    const { userId, title, message, type, category, icon, color, priority, actionUrl, metadata, expiresAt } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'userId, title, and message are required',
      });
    }

    const notification = await notificationService.sendNotification(userId, {
      title,
      message,
      type: type || 'client',
      category: category || 'system',
      icon: icon || 'FiInfo',
      color: color || '#3B82F6',
      priority: priority || 'medium',
      actionUrl: actionUrl || null,
      metadata: metadata || {},
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    res.status(201).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending notification',
      error: error.message,
    });
  }
};

/**
 * Send bulk notifications (admin/system only)
 * POST /api/v1/notifications/bulk-send
 */
exports.sendBulkNotifications = async (req, res) => {
  try {
    const { userIds, templateName, data, options } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required',
      });
    }

    if (!templateName) {
      return res.status(400).json({
        success: false,
        message: 'templateName is required',
      });
    }

    const notifications = await notificationService.sendBulkNotifications(
      userIds,
      templateName,
      data || {},
      options || {}
    );

    res.status(201).json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending bulk notifications',
      error: error.message,
    });
  }
};


