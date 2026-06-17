const express = require('express');
const router = express.Router();
const affiliateController = require('../controllers/affiliateController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const AFFILIATE_ADMIN_ROLES = ['superAdmin', 'couponManager', 'marketingManager'];

router.use(authMiddleware);
router.use(adminMiddleware(AFFILIATE_ADMIN_ROLES));

router.post('/create', affiliateController.createAffiliate);
router.get('/all', affiliateController.getAllAffiliates);
router.get('/get/:id', affiliateController.getAffiliateById);
router.patch('/update/:id', affiliateController.updateAffiliate);
router.delete('/delete/:id', affiliateController.deleteAffiliate);

module.exports = router;
