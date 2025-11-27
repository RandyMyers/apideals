const express = require('express');
const router = express.Router();
const affiliateController = require('../controllers/affiliateController');

// Routes
router.post('/create', affiliateController.createAffiliate);
router.get('/all', affiliateController.getAllAffiliates);
router.get('/get/:id', affiliateController.getAffiliateById);
router.patch('/update/:id', affiliateController.updateAffiliate);
router.delete('/delete/:id', affiliateController.deleteAffiliate);

module.exports = router;
