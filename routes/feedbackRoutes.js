const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Optional auth middleware - only applies if token is present
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return authMiddleware(req, res, next);
  }
  next();
};

// Public route - submit feedback (authMiddleware optional for userId)
router.post('/submit', optionalAuth, feedbackController.submitFeedback);

// Admin routes
router.get('/all', authMiddleware, adminMiddleware, feedbackController.getAllFeedback);
router.get('/type/:type', authMiddleware, adminMiddleware, feedbackController.getFeedbackByType);
router.get('/:id', authMiddleware, adminMiddleware, feedbackController.getFeedbackById);
router.patch('/update/:id', authMiddleware, adminMiddleware, feedbackController.updateFeedback);
router.delete('/delete/:id', authMiddleware, adminMiddleware, feedbackController.deleteFeedback);

module.exports = router;

