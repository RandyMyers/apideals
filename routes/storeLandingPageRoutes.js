const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const storeLandingPageController = require('../controllers/storeLandingPageController');

// Admin CRUD (protected)
router.get('/all', authMiddleware, storeLandingPageController.adminOnly, storeLandingPageController.listLandingPages);
router.get('/:id', authMiddleware, storeLandingPageController.adminOnly, storeLandingPageController.getLandingPageById);
router.post('/create', authMiddleware, storeLandingPageController.adminOnly, storeLandingPageController.createLandingPage);
router.patch('/update/:id', authMiddleware, storeLandingPageController.adminOnly, storeLandingPageController.updateLandingPage);
router.delete('/delete/:id', authMiddleware, storeLandingPageController.adminOnly, storeLandingPageController.deleteLandingPage);

module.exports = router;

