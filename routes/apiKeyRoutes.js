const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKeyController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// All api-key management routes require JWT auth (not API key) + admin role
const allowedTypes = ['superAdmin', 'couponManager'];

router.post('/', authMiddleware, adminMiddleware(allowedTypes), apiKeyController.createApiKey);
router.get('/', authMiddleware, adminMiddleware(allowedTypes), apiKeyController.listApiKeys);
router.delete('/:id', authMiddleware, adminMiddleware(allowedTypes), apiKeyController.revokeApiKey);

module.exports = router;
