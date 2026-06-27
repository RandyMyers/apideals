const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const BLOG_ADMIN_ROLES = ['superAdmin', 'contentEditor', 'marketingManager'];

// Create a new blog post (with image upload) - Private Route
router.post('/create', authMiddleware, adminMiddleware(BLOG_ADMIN_ROLES), blogController.createBlog);

// Get all blog posts - Public Route
router.get('/all', blogController.getAllBlogs);

// Get a single blog post by ID - Public Route
router.get('/get/:id', blogController.getBlogById);

// Get a single blog post by slug - Public Route (for React app)
router.get('/slug/:slug', blogController.getBlogBySlug);

// Update a blog post by ID - Private Route
router.patch('/update/:id', authMiddleware, adminMiddleware(BLOG_ADMIN_ROLES), blogController.updateBlog);

// Delete a blog post by ID - Private Route
router.delete('/delete/:id', authMiddleware, adminMiddleware(BLOG_ADMIN_ROLES), blogController.deleteBlog);

// Add a comment to a blog post - Private Route
router.post('/comments/:id',blogController.addComment);

// Like a blog post - Private Route
router.post('/like/:id',blogController.likeBlog);

// Publish a blog post - Private Route (Admin)
router.patch('/publish/:id', authMiddleware, adminMiddleware(BLOG_ADMIN_ROLES), blogController.publishBlog);

module.exports = router;
