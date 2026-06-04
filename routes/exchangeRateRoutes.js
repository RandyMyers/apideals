const express = require('express');
const exchangeRateController = require('../controllers/exchangeRateController');

const router = express.Router();

router.get('/supported', exchangeRateController.getSupportedCurrencies);
router.get('/meta', exchangeRateController.getRatesMeta);

module.exports = router;
