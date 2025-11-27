const express = require('express');
const router = express.Router();
const faqController = require('../controllers/faqController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes
router.get('/all', faqController.getAllFAQs);
router.get('/category/:category', faqController.getFAQsByCategory);
router.get('/:id', faqController.getFAQById);

// Admin routes
router.get('/admin/all', authMiddleware, adminMiddleware, faqController.getAllFAQsAdmin);
router.post('/create', authMiddleware, adminMiddleware, faqController.createFAQ);
router.patch('/update/:id', authMiddleware, adminMiddleware, faqController.updateFAQ);
router.delete('/delete/:id', authMiddleware, adminMiddleware, faqController.deleteFAQ);

module.exports = router;

