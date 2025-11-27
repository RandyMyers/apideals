const express = require('express');
const router = express.Router();
const adminMiddleware = require('../middleware/adminMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const productController = require('../controllers/productController');

// Route to synchronize products from WooCommerce
router.post('/sync', authMiddleware, productController.syncProducts);

// Route to get all products (restricted to admins)
router.get('/all',  productController.getAllProducts);

// Route to get products by user ID
router.get('/user/:userId', authMiddleware, productController.getProductsByUserId);

// Route to get a single product by ID
router.get('/get/:id', authMiddleware, productController.getProductById);

// Route to update a product by ID
router.patch('/update/:id', authMiddleware, productController.updateProduct);

// Route to delete a product by ID
router.delete('/delete/:id', authMiddleware, productController.deleteProduct);

// Delete all products
router.delete('/remove/all', productController.deleteAllProducts);

// Delete all products by user ID
router.delete('/delete/user/:userId', productController.deleteProductsByUserId);

module.exports = router;

