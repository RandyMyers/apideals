const express = require('express');
const forumController = require('../controllers/forumController');
const forumAdminController = require('../controllers/forumAdminController');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();
const adminRoles = ['superAdmin', 'contentEditor', 'customerSupport'];

router.get('/categories', forumController.listCategories);
router.get('/recent', forumController.listRecentThreads);
router.get('/categories/:slug/rss', forumController.getCategoryRss);
router.get('/categories/:slug', forumController.getCategory);
router.get('/tags', forumController.listPopularTags);
router.get('/tags/:tag', forumController.getThreadsByTag);
router.get('/leaderboard', forumController.getLeaderboard);
router.get('/search', forumController.searchForum);
router.get('/stores/:storeSlug/discussions', forumController.getStoreDiscussions);
router.get('/threads', forumController.listThreads);
router.get('/threads/:slug', optionalAuthMiddleware, forumController.getThread);

router.post('/threads', authMiddleware, forumController.createThread);
router.post('/threads/:threadId/posts', authMiddleware, forumController.createPost);
router.post('/threads/:threadId/subscribe', authMiddleware, forumController.subscribeThread);
router.patch('/posts/:postId', authMiddleware, forumController.editPost);
router.delete('/posts/:postId', authMiddleware, forumController.deletePost);
router.post('/posts/:postId/vote', authMiddleware, forumController.votePost);
router.get('/report-captcha', forumController.getReportCaptcha);
router.post('/report', optionalAuthMiddleware, forumController.reportContent);

router.get('/admin/categories', authMiddleware, adminMiddleware(adminRoles), forumAdminController.listCategoriesAdmin);
router.get('/admin/categories/:id', authMiddleware, adminMiddleware(adminRoles), forumAdminController.getCategoryAdmin);
router.post('/admin/categories', authMiddleware, adminMiddleware(adminRoles), forumAdminController.createCategory);
router.patch('/admin/categories/:id', authMiddleware, adminMiddleware(adminRoles), forumAdminController.updateCategory);
router.delete('/admin/categories/:id', authMiddleware, adminMiddleware(adminRoles), forumAdminController.deleteCategory);

router.get('/admin/threads', authMiddleware, adminMiddleware(adminRoles), forumAdminController.listThreadsAdmin);
router.get('/admin/threads/:id', authMiddleware, adminMiddleware(adminRoles), forumAdminController.getThreadAdmin);
router.patch('/admin/threads/:id', authMiddleware, adminMiddleware(adminRoles), forumAdminController.updateThreadAdmin);
router.get('/admin/posts', authMiddleware, adminMiddleware(adminRoles), forumAdminController.listPostsAdmin);
router.patch('/admin/posts/:id', authMiddleware, adminMiddleware(adminRoles), forumAdminController.updatePostAdmin);
router.get('/admin/reports', authMiddleware, adminMiddleware(adminRoles), forumAdminController.listReports);
router.patch('/admin/reports/:id', authMiddleware, adminMiddleware(adminRoles), forumAdminController.resolveReport);

router.get('/admin/settings', authMiddleware, adminMiddleware(adminRoles), forumAdminController.getForumSettings);
router.patch('/admin/settings', authMiddleware, adminMiddleware(adminRoles), forumAdminController.updateForumSettings);

module.exports = router;
