const express = require('express');
const router = express.Router();
const viewController = require('../controllers/viewController');

// Route to log a new view
router.post('/create', viewController.createView);

// Route to get all views
router.get('/all', viewController.getAllViews);

// Route to get views by a specific visitor (by visitorId)
router.get('/visitor/:visitorId', viewController.getViewsByVisitor);

// Route to delete a specific view (by viewId)
router.delete('/delete/:id', viewController.deleteView);

// Route to delete all views for a specific visitor (by visitorId)
router.delete('/bulk/delete/visitor/:visitorId', viewController.deleteViewsByVisitor);

module.exports = router;
