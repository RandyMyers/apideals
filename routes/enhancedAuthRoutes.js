const express = require('express');
const router = express.Router();
const enhancedAuthController = require('../controllers/enhancedAuthController');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');
const { validate } = require('../utils/validation');
const { userValidation } = require('../utils/validation');
const { emailAuthRateLimit } = require('../middleware/security');

// Public routes (register/login handled by authController — referral + subscription)

router.post('/verify-email', 
  enhancedAuthController.verifyEmail
);

router.post('/resend-verification',
  emailAuthRateLimit,
  optionalAuthMiddleware,
  enhancedAuthController.resendVerification
);

router.post('/request-password-reset',
  emailAuthRateLimit,
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


