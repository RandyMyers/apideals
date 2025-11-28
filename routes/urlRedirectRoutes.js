const express = require('express');
const router = express.Router();
const urlRedirectController = require('../controllers/urlRedirectController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Admin routes - Manage redirects
router.post('/admin/redirects', authMiddleware, adminMiddleware, urlRedirectController.createRedirect);
router.get('/admin/redirects', authMiddleware, adminMiddleware, urlRedirectController.getAllRedirects);
router.put('/admin/redirects/:id', authMiddleware, adminMiddleware, urlRedirectController.updateRedirect);
router.delete('/admin/redirects/:id', authMiddleware, adminMiddleware, urlRedirectController.deleteRedirect);
router.post('/admin/redirects/bulk-import', authMiddleware, adminMiddleware, urlRedirectController.bulkImportRedirects);
router.post('/admin/redirects/auto-generate-blogs', authMiddleware, adminMiddleware, urlRedirectController.autoGenerateBlogRedirects);

module.exports = router;

