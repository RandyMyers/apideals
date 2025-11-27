const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes (for client app to display policies)
router.get('/all', policyController.getAllPolicies);
router.get('/:title', policyController.getPolicyByTitle);

// Admin routes (protected with authentication and admin middleware)
router.post('/create', authMiddleware, adminMiddleware, policyController.createPolicy);
router.patch('/update/:title', authMiddleware, adminMiddleware, policyController.updatePolicy);
router.delete('/delete/:title', authMiddleware, adminMiddleware, policyController.deletePolicy);

module.exports = router;
