const express = require('express');
const router = express.Router();
const siteController = require('../controllers/siteController');

router.get('/all', siteController.getAllSites);

module.exports = router;
