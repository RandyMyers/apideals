const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Optional auth middleware - only applies if token is present
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return authMiddleware(req, res, next);
  }
  next();
};

// Public route - submit contact form (authMiddleware optional for userId)
router.post('/submit', optionalAuth, contactController.submitContact);

// Admin routes
router.get('/all', authMiddleware, adminMiddleware, contactController.getAllSubmissions);
router.get('/:id', authMiddleware, adminMiddleware, contactController.getSubmissionById);
router.patch('/update/:id', authMiddleware, adminMiddleware, contactController.updateSubmission);
router.delete('/delete/:id', authMiddleware, adminMiddleware, contactController.deleteSubmission);

module.exports = router;

