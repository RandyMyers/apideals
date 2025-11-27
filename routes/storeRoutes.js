const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController'); // Import the controller functions
const authMiddleware = require('../middleware/authMiddleware'); // Import authMiddleware

// Route to create a new store (authenticated users only)
router.post('/create', authMiddleware, storeController.createStore);

// Route to get all stores (with pagination, sorting, filtering)
router.get('/all', storeController.getAllStores);

// Route to get top stores (by views)
router.get('/top', storeController.getTopStores);

// Route to get sponsored stores
router.get('/sponsored', storeController.getSponsoredStores);

// Route to get a store by its ID
router.get('/:id', storeController.getStoreById);

router.get('/user/:userId', storeController.getStoresByUserId);

// Route to update a store by its ID
router.patch('/update/:id', authMiddleware, storeController.updateStore);

// Route to update sponsored status (Admin or Store Owner)
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
