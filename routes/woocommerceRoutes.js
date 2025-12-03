const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { validate, wooCommerceValidation } = require('../utils/validation');
const wc = require('../controllers/woocommerceController');

// Debug: Test route registration
router.get('/test-route', (req, res) => {
  res.json({ message: 'WooCommerce routes are working', path: '/api/v1/woocommerce/test-route' });
});

// Merchant connects a store
router.post(
  '/connect',
  authMiddleware,
  validate(wooCommerceValidation.connect),
  wc.connectStore
);

// Test connection
router.get('/stores/:storeId/test', authMiddleware, wc.testConnection);

// Pull coupons now
router.post('/stores/:storeId/pull-coupons', authMiddleware, wc.pullCoupons);

// Pull products as deals now
router.post('/stores/:storeId/pull-products', authMiddleware, wc.pullProductsAsDeals);
// Read-only browse endpoints for wizard
router.get('/stores/:storeId/coupons', authMiddleware, wc.listWcCoupons);
router.get('/stores/:storeId/products', authMiddleware, wc.listWcProducts);

// Selective sync endpoints for wizard
router.post('/stores/:storeId/sync-coupons', authMiddleware, wc.syncSelectedCoupons);
router.post('/stores/:storeId/sync-deals', authMiddleware, wc.syncSelectedDeals);

// Direct coupon creation in WooCommerce
router.post('/stores/:storeId/coupons/create', authMiddleware, wc.createWcCoupon);

// List connected stores for current user
router.get('/stores', authMiddleware, wc.listStores);

// Webhook endpoint
router.post('/webhook', wc.webhook);

module.exports = router;


