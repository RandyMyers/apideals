const express = require('express');
const router = express.Router();
const couponBoostController = require('../controllers/couponBoostController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// User routes (require authentication)
router.post('/purchase',
  authMiddleware,
  couponBoostController.purchaseBoost
);

router.post('/:boostId/activate',
  authMiddleware,
  couponBoostController.activateBoost
);

router.get('/my-boosts',
  authMiddleware,
  couponBoostController.getUserBoosts
);

router.get('/:id',
  authMiddleware,
  couponBoostController.getBoostById
);

router.delete('/:id',
  authMiddleware,
  couponBoostController.cancelBoost
);

// Public routes (for tracking)
router.get('/active',
  couponBoostController.getActiveBoosts
);

router.post('/:boostId/impression',
  couponBoostController.trackImpression
);

router.post('/:boostId/click',
  couponBoostController.trackClick
);

// Admin routes (require admin authentication)
router.get('/admin/stats',
  authMiddleware,
  adminMiddleware(['superAdmin', 'marketingManager']),
  couponBoostController.getBoostStats
);

module.exports = router;


