const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const authMiddleware = require('../middleware/authMiddleware');
const authOrApiKeyMiddleware = require('../middleware/authOrApiKeyMiddleware');

// Route to create a new store (JWT or API key)
router.post('/create', authOrApiKeyMiddleware, storeController.createStore);

// Route to get all stores (with pagination, sorting, filtering)
router.get('/all', storeController.getAllStores);

// Route to get top stores (by views)
router.get('/top', storeController.getTopStores);

// Route to get sponsored stores
router.get('/sponsored', storeController.getSponsoredStores);

// Route to get trending stores by category (MUST come before /:id)
router.get('/trending/category/:categoryId', storeController.getTrendingStoresByCategory);

// Route to get a store by its ID
router.get('/:id', storeController.getStoreById);

router.get('/user/:userId', storeController.getStoresByUserId);

// Route to update a store by its ID (JWT or API key)
router.patch('/update/:id', authOrApiKeyMiddleware, storeController.updateStore);

// Route to update sponsored status (Admin or Store Owner) - JWT only (admin UI)
router.patch('/sponsored/:id', authMiddleware, storeController.updateSponsoredStatus);

// Route to update a store by its ID
router.patch('/rating/:id', storeController.updateStoreRating);

router.get('/counts/user/:userId', storeController.getUserDealAndCouponCounts);

// Route to follow a store
router.post('/:id/follow', authMiddleware, storeController.followStore);

// Route to unfollow a store
router.post('/:id/unfollow', authMiddleware, storeController.unfollowStore);

// Route to delete a store by its ID
router.delete('/delete/:id', storeController.deleteStore);

module.exports = router;
