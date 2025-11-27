/**
 * Notification Template Routes
 * Handles notification template CRUD operations (admin only)
 */

const express = require('express');
const router = express.Router();
const notificationTemplateController = require('../controllers/notificationTemplateController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// All template routes require admin authentication
const allowedAdminTypes = ['superAdmin', 'couponManager', 'customerSupport', 'contentEditor', 'marketingManager'];
router.use(authMiddleware);
router.use(adminMiddleware(allowedAdminTypes));

// Template CRUD routes
router.get('/', notificationTemplateController.getAllTemplates);
router.get('/:id', notificationTemplateController.getTemplateById);
router.post('/', notificationTemplateController.createTemplate);
router.put('/:id', notificationTemplateController.updateTemplate);
router.delete('/:id', notificationTemplateController.deleteTemplate);
router.post('/seed', notificationTemplateController.seedTemplates);

module.exports = router;


