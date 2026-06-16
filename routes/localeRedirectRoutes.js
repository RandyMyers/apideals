const express = require('express');
const router = express.Router();
const localeRedirectController = require('../controllers/localeRedirectController');

router.get('/locale/redirect-check', localeRedirectController.redirectCheck);

module.exports = router;
