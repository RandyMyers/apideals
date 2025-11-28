const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController'); // Adjust the path as needed
const authMiddleware = require('../middleware/authMiddleware'); // Import auth middleware
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

// 1. Create a new interaction (optional auth - works for both logged-in and anonymous users)
router.post('/create', optionalAuth, interactionController.createInteraction);

// 2. Get all interactions
router.get('/all', interactionController.getAllInteractions);

// 3. Get all interactions for a specific visitor
router.get('/visitor/:visitorId', interactionController.getInteractionsByVisitorId);

// 4. Get all interactions for a specific target
router.get('/target/:targetId', interactionController.getInteractionsByType);

// 5. Delete a specific interaction by ID
router.delete('/delete/:id', interactionController.deleteInteraction);

// 6. Delete all interactions for a specific visitor
router.delete('/delete/visitor/:visitorId', interactionController.deleteInteractionsByVisitorId);

// 7. Get saved items for authenticated user
router.get('/saved', authMiddleware, interactionController.getSavedItems);

// 8. Save an item
router.post('/save', authMiddleware, interactionController.saveItem);

// 9. Unsave an item
router.post('/unsave', authMiddleware, interactionController.unsaveItem);

module.exports = router;
