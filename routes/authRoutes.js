const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Register route
router.post('/register', authController.register);

// Login route
router.post('/login', authController.login);

// Admin Registration Route (only superAdmin can register other admins)
router.post('/admin/register', authController.registerAdmin);
  
  // Admin Login Route
  router.post('/admin/login', authController.adminLogin);

  router.post('/change/password', authController.changePassword); 

// Password Reset Request route
router.post('/password/reset/request', authController.passwordResetRequest);

// Password Reset route
router.post('/reset/password', authController.passwordReset);

// Verify token route (no auth middleware needed - it verifies the token itself)
router.get('/verify', authController.verifyToken);

module.exports = router;
