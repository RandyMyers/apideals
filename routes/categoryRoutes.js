const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController'); // Import the controller functions

// Route to create a new category
router.post('/create', categoryController.createCategory);

// Route to get all categories
router.get('/all', categoryController.getCategories);

// Route to get a category by its ID
router.get('/get/:id', categoryController.getCategoryById);

// Route to update a category by its ID
router.patch('/update/:id', categoryController.updateCategory);

// Route to delete a category by its ID
router.delete('/delete/:id', categoryController.deleteCategory);

// Route to get categories by parent category (nested categories)
router.get('/parent/:parentId', categoryController.getCategoriesByParent);

// Route to get popular categories (for footer, max 6)
router.get('/popular', categoryController.getPopularCategories);

module.exports = router;
