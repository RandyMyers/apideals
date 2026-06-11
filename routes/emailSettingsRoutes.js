const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const emailSettingsController = require('../controllers/emailSettingsController');

const router = express.Router();
const adminRoles = ['superAdmin'];

router.get('/', authMiddleware, adminMiddleware(adminRoles), emailSettingsController.getEmailSettings);
router.patch('/', authMiddleware, adminMiddleware(adminRoles), emailSettingsController.updateEmailSettings);
router.post('/test', authMiddleware, adminMiddleware(adminRoles), emailSettingsController.testEmailSettings);

module.exports = router;
