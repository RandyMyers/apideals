const express = require('express');
const router = express.Router();
const helpArticleController = require('../controllers/helpArticleController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes
router.get('/all', helpArticleController.getAllHelpArticles);
router.get('/category/:category', helpArticleController.getArticlesByCategory);
router.get('/:id', helpArticleController.getArticleById);

// Admin routes
router.get('/admin/all', authMiddleware, adminMiddleware, helpArticleController.getAllHelpArticlesAdmin);
router.post('/create', authMiddleware, adminMiddleware, helpArticleController.createHelpArticle);
router.patch('/update/:id', authMiddleware, adminMiddleware, helpArticleController.updateHelpArticle);
router.delete('/delete/:id', authMiddleware, adminMiddleware, helpArticleController.deleteHelpArticle);

module.exports = router;

