const express = require('express');
const router = express.Router();
const viewController = require('../controllers/viewController');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Optional auth middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (token && token !== 'null' && token !== 'undefined') {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
        if (!req.user.id && req.user._id) {
          req.user.id = req.user._id.toString();
        }
      }
    } catch (err) {
      // Silently fail - user is anonymous
    }
  }
  next();
};

// Route to log a new view (optional auth - works for both logged-in and anonymous users)
router.post('/create', optionalAuth, viewController.createView);

// Route to get all views
router.get('/all', viewController.getAllViews);

// Route to get views by a specific visitor (by visitorId)
router.get('/visitor/:visitorId', viewController.getViewsByVisitor);

// Route to delete a specific view (by viewId)
router.delete('/delete/:id', viewController.deleteView);

// Route to delete all views for a specific visitor (by visitorId)
router.delete('/bulk/delete/visitor/:visitorId', viewController.deleteViewsByVisitor);

module.exports = router;
