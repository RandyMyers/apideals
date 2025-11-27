const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController'); // Adjust the path as needed
const authMiddleware = require('../middleware/authMiddleware'); // Import auth middleware

// 1. Create a new interaction
router.post('/create', interactionController.createInteraction);

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
