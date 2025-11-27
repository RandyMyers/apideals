const express = require('express');
const router = express.Router();
const enhancedAuthController = require('../controllers/enhancedAuthController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../utils/validation');
const { userValidation } = require('../utils/validation');

// Public routes
router.post('/register', 
  validate(userValidation.register),
  enhancedAuthController.register
);

router.post('/login', 
  validate(userValidation.login),
  enhancedAuthController.login
);

router.post('/verify-email', 
  enhancedAuthController.verifyEmail
);

router.post('/request-password-reset', 
  validate(userValidation.resetPassword),
  enhancedAuthController.requestPasswordReset
);

router.post('/reset-password', 
  enhancedAuthController.resetPassword
);

router.post('/refresh-token', 
  enhancedAuthController.refreshToken
);

// Protected routes
router.post('/logout', 
  authMiddleware,
  enhancedAuthController.logout
);

router.get('/sessions', 
  authMiddleware,
  enhancedAuthController.getSessions
);

router.delete('/sessions/:sessionId', 
  authMiddleware,
  enhancedAuthController.revokeSession
);

module.exports = router;


