const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const logoDevController = require('../controllers/logoDevController');

const adminOnly = [
  authMiddleware,
  adminMiddleware([
    'superAdmin',
    'couponManager',
    'contentEditor',
    'marketingManager',
    'customerSupport',
  ]),
];

router.get('/status', adminOnly, logoDevController.getStatus);
router.get('/search', adminOnly, logoDevController.search);
router.get('/image', adminOnly, logoDevController.resolveImageUrl);

module.exports = router;
