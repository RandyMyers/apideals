const User = require('../models/user');
const notificationService = require('./notificationService');
const { logger } = require('../utils/logger');

/**
 * System Alert Service
 * Sends notifications to admins for critical system events
 */

// Alert priorities
const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

/**
 * Send system alert to all super admins
 * @param {string} message - Alert message
 * @param {string} priority - Alert priority (low, medium, high, urgent)
 * @param {Object} metadata - Additional metadata about the alert
 */
const sendSystemAlert = async (message, priority = PRIORITY.MEDIUM, metadata = {}) => {
  try {
    // Only send alerts in production or if explicitly enabled
    if (process.env.NODE_ENV !== 'production' && !process.env.ENABLE_SYSTEM_ALERTS) {
      logger.debug('System alerts disabled in development mode');
      return;
    }

    // Get all super admins
    const adminUsers = await User.find({ 
      userType: 'superAdmin',
      isActive: true
    }).select('_id username email').lean();

    if (!adminUsers || adminUsers.length === 0) {
      logger.warn('No super admin users found to send system alert');
      return;
    }

    const adminIds = adminUsers.map(admin => admin._id.toString());
    
    // Prepare notification data
    const notificationData = {
      message,
      priority,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    // Send bulk notifications to all admins
    await notificationService.sendBulkNotifications(
      adminIds,
      'system_alert',
      notificationData
    );

    logger.info(`System alert sent to ${adminIds.length} admin(s)`, {
      priority,
      message: message.substring(0, 100) // Log first 100 chars
    });
  } catch (error) {
    // Don't throw - we don't want alert failures to crash the system
    logger.error('Failed to send system alert', {
      error: error.message,
      originalMessage: message
    });
  }
};

/**
 * Send alert for database connection errors
 */
const sendDatabaseAlert = async (error) => {
  await sendSystemAlert(
    `Database connection error: ${error.message}`,
    PRIORITY.URGENT,
    {
      type: 'database_error',
      error: error.message,
      stack: error.stack
    }
  );
};

/**
 * Send alert for critical application errors
 */
const sendCriticalErrorAlert = async (error, context = {}) => {
  await sendSystemAlert(
    `Critical application error: ${error.message}`,
    PRIORITY.HIGH,
    {
      type: 'critical_error',
      error: error.message,
      stack: error.stack,
      ...context
    }
  );
};

/**
 * Send alert for security-related events
 */
const sendSecurityAlert = async (message, details = {}) => {
  await sendSystemAlert(
    `Security alert: ${message}`,
    PRIORITY.URGENT,
    {
      type: 'security_alert',
      ...details
    }
  );
};

/**
 * Send alert for system resource issues
 */
const sendResourceAlert = async (resource, usage, threshold) => {
  await sendSystemAlert(
    `${resource} usage is at ${usage}% (threshold: ${threshold}%)`,
    usage >= 90 ? PRIORITY.URGENT : PRIORITY.HIGH,
    {
      type: 'resource_alert',
      resource,
      usage,
      threshold
    }
  );
};

/**
 * Send alert for service unavailability
 */
const sendServiceUnavailableAlert = async (serviceName, error) => {
  await sendSystemAlert(
    `${serviceName} service is unavailable: ${error.message}`,
    PRIORITY.HIGH,
    {
      type: 'service_unavailable',
      service: serviceName,
      error: error.message
    }
  );
};

module.exports = {
  sendSystemAlert,
  sendDatabaseAlert,
  sendCriticalErrorAlert,
  sendSecurityAlert,
  sendResourceAlert,
  sendServiceUnavailableAlert,
  PRIORITY
};

