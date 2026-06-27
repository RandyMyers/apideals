const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const authMiddleware = require('../middleware/authMiddleware');

const BLOG_ADMIN_ROLES = ['superAdmin', 'contentEditor', 'marketingManager'];

/** Uses req.user from authMiddleware — same pattern as store update (no second JWT pass). */
function requireBlogAdmin(req, res, next) {
  console.log('[blogRoutes] requireBlogAdmin', {
    path: req.path,
    method: req.method,
    userId: req.user?.id || req.user?._id?.toString(),
    userType: req.user?.userType,
  });

  if (!req.user) {
    console.error('[blogRoutes] requireBlogAdmin: no req.user after authMiddleware');
    return res.status(401).json({ message: 'Authentication required.', code: 'AUTH_REQUIRED' });
  }

  if (!BLOG_ADMIN_ROLES.includes(req.user.userType)) {
    console.error('[blogRoutes] requireBlogAdmin: insufficient role', req.user.userType);
    return res.status(403).json({
      message: 'Access denied. Insufficient permissions.',
      code: 'FORBIDDEN',
      userType: req.user.userType,
    });
  }

  console.log('[blogRoutes] requireBlogAdmin: ok → controller');
  next();
}

function logBlogWrite(req, res, next) {
  console.log('[blogRoutes] write request', {
    method: req.method,
    path: req.path,
    blogId: req.params.id,
    contentType: req.get('content-type'),
    bodyKeys: req.body ? Object.keys(req.body) : [],
    contentLength: req.get('content-length'),
  });
  next();
}

// Create a new blog post (with image upload) - Private Route
router.post('/create', authMiddleware, logBlogWrite, requireBlogAdmin, blogController.createBlog);

// Get all blog posts - Public Route
router.get('/all', blogController.getAllBlogs);

// Get a single blog post by ID - Public Route
router.get('/get/:id', blogController.getBlogById);

// Get a single blog post by slug - Public Route (for React app)
router.get('/slug/:slug', blogController.getBlogBySlug);

// Update a blog post by ID - Private Route
router.patch('/update/:id', authMiddleware, logBlogWrite, requireBlogAdmin, blogController.updateBlog);

// Delete a blog post by ID - Private Route
router.delete('/delete/:id', authMiddleware, logBlogWrite, requireBlogAdmin, blogController.deleteBlog);

// Add a comment to a blog post - Private Route
router.post('/comments/:id', blogController.addComment);

// Like a blog post - Private Route
router.post('/like/:id', blogController.likeBlog);

// Publish a blog post - Private Route (Admin)
router.patch('/publish/:id', authMiddleware, logBlogWrite, requireBlogAdmin, blogController.publishBlog);

module.exports = router;
