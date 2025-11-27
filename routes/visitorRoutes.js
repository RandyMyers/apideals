const express = require('express');
const VisitorController = require('../controllers/visitorController'); // Adjust the path as per your project structure

const router = express.Router();

// Routes for Visitor operations
router.post('/create', VisitorController.createVisitor); // Create a new visitor
router.get('/all', VisitorController.getAllVisitors); // Get all visitors
router.get('/countries', VisitorController.getVisitorCountries); // Get list of countries from visitor data
router.get('/:id', VisitorController.getVisitorById); // Get a specific visitor by ID
router.delete('/delete/:id', VisitorController.deleteVisitor); // Delete visitor and related data

module.exports = router;
