/**
 * Notification Routes
 * Handles notification-related endpoints
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// All notification routes require authentication
router.use(authMiddleware);

// User notification routes
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/:id', notificationController.getNotificationById);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

// Admin/system only routes
const allowedAdminTypes = ['superAdmin', 'couponManager', 'customerSupport', 'contentEditor', 'marketingManager'];
router.post('/send', adminMiddleware(allowedAdminTypes), notificationController.sendNotification);
router.post('/bulk-send', adminMiddleware(allowedAdminTypes), notificationController.sendBulkNotifications);

module.exports = router;


