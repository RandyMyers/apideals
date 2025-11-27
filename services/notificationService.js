/**
 * Notification Service
 * Helper functions for creating and managing notifications
 */

const Notification = require('../models/notification');
const NotificationTemplate = require('../models/notificationTemplate');

/**
 * Replace placeholders in template message
 * @param {string} template - Template string with placeholders like {userName}
 * @param {object} data - Data object with values to replace
 * @returns {string} - Rendered message
 */
const renderTemplate = (template, data = {}) => {
  let rendered = template;
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    rendered = rendered.replace(regex, data[key] || '');
  });
  return rendered;
};

/**
 * Create notification from template
 * @param {string} userId - User ID to send notification to
 * @param {string} templateName - Template name (e.g., 'welcome', 'coupon_approved')
 * @param {object} data - Data to fill template placeholders
 * @param {object} options - Additional options (actionUrl, metadata, expiresAt)
 * @returns {Promise<Object>} - Created notification
 */
exports.createNotification = async (userId, templateName, data = {}, options = {}) => {
  try {
    // Find template
    const template = await NotificationTemplate.findOne({ 
      name: templateName,
      isActive: true 
    });

    if (!template) {
      throw new Error(`Template '${templateName}' not found or inactive`);
    }

    // Render title and message with data
    const title = renderTemplate(template.title, data);
    const message = renderTemplate(template.message, data);

    // Create notification
    const notification = new Notification({
      userId,
      templateId: template._id,
      title,
      message,
      type: template.type === 'both' ? 'client' : template.type,
      category: template.category,
      icon: template.icon,
      color: template.color,
      priority: template.priority,
      actionUrl: options.actionUrl || null,
      metadata: options.metadata || {},
      expiresAt: options.expiresAt || null,
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error(`Error creating notification from template '${templateName}':`, error);
    throw error;
  }
};

/**
 * Send custom notification (without template)
 * @param {string} userId - User ID to send notification to
 * @param {object} notificationData - Notification data
 * @returns {Promise<Object>} - Created notification
 */
exports.sendNotification = async (userId, notificationData) => {
  try {
    const notification = new Notification({
      userId,
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type || 'client',
      category: notificationData.category || 'system',
      icon: notificationData.icon || 'FiInfo',
      color: notificationData.color || '#3B82F6',
      priority: notificationData.priority || 'medium',
      actionUrl: notificationData.actionUrl || null,
      metadata: notificationData.metadata || {},
      expiresAt: notificationData.expiresAt || null,
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for security check)
 * @returns {Promise<Object>} - Updated notification
 */
exports.markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { 
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }

    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Update result
 */
exports.markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { 
        isRead: true,
        readAt: new Date(),
      }
    );

    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Get user notifications
 * @param {string} userId - User ID
 * @param {object} filters - Filter options (isRead, category, limit, skip)
 * @returns {Promise<Array>} - Array of notifications
 */
exports.getUserNotifications = async (userId, filters = {}) => {
  try {
    const query = { userId };

    if (filters.isRead !== undefined) {
      query.isRead = filters.isRead;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    const limit = filters.limit || 20;
    const skip = filters.skip || 0;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    return notifications;
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

/**
 * Get unread count for user
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Unread count
 */
exports.getUnreadCount = async (userId) => {
  try {
    const count = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

/**
 * Delete notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for security check)
 * @returns {Promise<Object>} - Deleted notification
 */
exports.deleteNotification = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }

    return notification;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Cleanup expired notifications (for cron job)
 * @returns {Promise<Object>} - Delete result
 */
exports.cleanupExpiredNotifications = async () => {
  try {
    const result = await Notification.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    return result;
  } catch (error) {
    console.error('Error cleaning up expired notifications:', error);
    throw error;
  }
};

/**
 * Send bulk notifications to multiple users
 * @param {Array<string>} userIds - Array of user IDs
 * @param {string} templateName - Template name
 * @param {object} data - Data to fill template placeholders
 * @param {object} options - Additional options
 * @returns {Promise<Array>} - Array of created notifications
 */
exports.sendBulkNotifications = async (userIds, templateName, data = {}, options = {}) => {
  try {
    const template = await NotificationTemplate.findOne({ 
      name: templateName,
      isActive: true 
    });

    if (!template) {
      throw new Error(`Template '${templateName}' not found or inactive`);
    }

    const title = renderTemplate(template.title, data);
    const message = renderTemplate(template.message, data);

    const notifications = userIds.map(userId => ({
      userId,
      templateId: template._id,
      title,
      message,
      type: template.type === 'both' ? 'client' : template.type,
      category: template.category,
      icon: template.icon,
      color: template.color,
      priority: template.priority,
      actionUrl: options.actionUrl || null,
      metadata: options.metadata || {},
      expiresAt: options.expiresAt || null,
    }));

    const result = await Notification.insertMany(notifications);
    return result;
  } catch (error) {
    console.error(`Error sending bulk notifications with template '${templateName}':`, error);
    throw error;
  }
};


