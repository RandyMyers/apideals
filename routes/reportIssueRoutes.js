const express = require('express');
const router = express.Router();
const reportIssueController = require('../controllers/reportIssueController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Optional auth middleware - only applies if token is present
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return authMiddleware(req, res, next);
  }
  next();
};

// Public route - submit report (authMiddleware optional for userId)
router.post('/submit', optionalAuth, reportIssueController.submitReport);

// Admin routes
router.get('/all', authMiddleware, adminMiddleware, reportIssueController.getAllReports);
router.get('/type/:type', authMiddleware, adminMiddleware, reportIssueController.getReportsByType);
router.get('/:id', authMiddleware, adminMiddleware, reportIssueController.getReportById);
router.patch('/update/:id', authMiddleware, adminMiddleware, reportIssueController.updateReport);
router.delete('/delete/:id', authMiddleware, adminMiddleware, reportIssueController.deleteReport);

module.exports = router;

